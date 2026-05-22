import { saveAs } from "file-saver";
import { getPortalBranding } from "@/lib/branding";
import { normalizeMediaUrl } from "@/lib/config";
import { createPdfBlob } from "@/lib/pdfClient";
import { buildDamageReportPdfDefinition, buildRsaReportPdfDefinition } from "@/lib/reports/pdfGenerator";
import { buildReportGallery } from "@/lib/reportGallery";
import type {
  ReportActionRow,
  ReportPhotoActionOptions,
  ReportPdfActionOptions,
} from "@/lib/reports/types";
import type { ReportDamageApiRow, RsaReportApiRow, BrandingSnapshot } from "@/lib/types";

const TEXT_ENCODER = new TextEncoder();

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    const byte = data[i];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(entries: { name: string; data: Uint8Array }[]): Blob {
  const fileParts: Uint8Array[] = [];
  const centralEntries: Uint8Array[] = [];
  let offset = 0;
  let centralSize = 0;

  entries.forEach((entry) => {
    const nameBytes = TEXT_ENCODER.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    fileParts.push(localHeader);
    offset += localHeader.length;

    fileParts.push(entry.data);
    offset += size;

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, offset - size - localHeader.length, true);
    centralHeader.set(nameBytes, 46);

    centralEntries.push(centralHeader);
    centralSize += centralHeader.length;
  });

  const zipSize = offset + centralSize + 22;
  const zipBuffer = new Uint8Array(zipSize);
  let pointer = 0;
  fileParts.forEach((part) => {
    zipBuffer.set(part, pointer);
    pointer += part.length;
  });
  centralEntries.forEach((part) => {
    zipBuffer.set(part, pointer);
    pointer += part.length;
  });

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);
  zipBuffer.set(eocd, pointer);

  return new Blob([zipBuffer], { type: "application/zip" });
}

function isDamageReport(report: ReportActionRow): report is ReportDamageApiRow {
  return "vin" in report;
}

function isRsaReport(report: ReportActionRow): report is RsaReportApiRow {
  return "subject" in report;
}

function sanitizeDownloadLabel(value?: string, fallback = "report"): string {
  const raw = (value || "").toString().trim();
  if (!raw) return fallback;
  const sanitized = raw.replace(/[^\w.-]+/g, "_");
  return sanitized || fallback;
}

function getFileExtensionFromUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    const match = parsed.pathname.match(/\\.[^./?]+$/);
    return match ? match[0].toLowerCase() : ".jpg";
  } catch {
    const fallbackMatch = url.match(/\\.[^./?]+$/);
    return fallbackMatch ? fallbackMatch[0].toLowerCase() : ".jpg";
  }
}

async function fetchImageDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const normalized = normalizeMediaUrl(url);
    const response = await fetch(normalized);
    if (!response.ok) return null;
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = window.btoa(binary);
    const mime = blob.type || "image/png";
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.error("[reportActions] map fetch error:", err);
    return null;
  }
}

export async function downloadReportPdf(options: ReportPdfActionOptions): Promise<void> {
  const { report, reportType, reportId, session } = options;
  const gallery = buildReportGallery(report);
  const mapDataUrl = await fetchImageDataUrl(gallery.mapMetadata?.mapImageUrl);
  const generatedAt = new Date().toLocaleString();
  const portalBranding = getPortalBranding(session);
  const brandingSnapshotFromSession = session?.branding_snapshot as BrandingSnapshot | undefined;
  const branding: BrandingSnapshot =
    brandingSnapshotFromSession ?? {
      organization_name: portalBranding.organizationName,
      organization_id: portalBranding.normalizedKey || undefined,
      logo_url: portalBranding.logoUrl ?? undefined,
    };

  let definition;
  if (reportType === "rsa") {
    definition = buildRsaReportPdfDefinition({
      report: report,
      branding,
      generatedAt,
      mapImage: mapDataUrl,
      mapMetadata: gallery.mapMetadata,
    });
  } else {
    definition = buildDamageReportPdfDefinition({
      report: report,
      branding,
      generatedAt,
      mapImage: mapDataUrl,
      mapMetadata: gallery.mapMetadata,
    });
  }

  if (!definition) {
    throw new Error("Could not build PDF definition");
  }

  const blob = await createPdfBlob(definition);
  const damageVin = isDamageReport(report) ? report.vin : undefined;
  const fileName =
    reportType === "rsa"
      ? `Valad_RSA_Manifest_${reportId.substring(0, 8)}.pdf`
      : `Valad_DamageReport_${damageVin || reportId.substring(0, 8)}.pdf`;
  saveAs(blob, fileName);
}

export async function downloadReportPhotos(options: ReportPhotoActionOptions): Promise<number> {
  const { report, reportId } = options;
  const gallery = buildReportGallery(report);
  if (gallery.photoUrls.length === 0) {
    throw new Error("No photos available");
  }

  const identifier =
    (isDamageReport(report) && report.vin) ||
    report.report_id ||
    (isRsaReport(report) && (report.subject || report.facility));
  const labelBase = sanitizeDownloadLabel(identifier || reportId) || `report_${reportId.substring(0, 8)}`;

  const entries: { name: string; data: Uint8Array }[] = [];

  for (let index = 0; index < gallery.photoUrls.length; index += 1) {
    const url = gallery.photoUrls[index];
    const normalizedUrl = normalizeMediaUrl(url);
    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch asset for archive");
    }
    const arrayBuffer = await response.arrayBuffer();
    const extension = getFileExtensionFromUrl(normalizedUrl);
    const nameSegment = `photo_${String(index + 1).padStart(2, "0")}`;
    entries.push({
      name: `${labelBase}_${nameSegment}${extension}`,
      data: new Uint8Array(arrayBuffer),
    });
  }

  const archiveBlob = buildZip(entries);
  saveAs(archiveBlob, `${labelBase}_photos.zip`);
  return entries.length;
}


