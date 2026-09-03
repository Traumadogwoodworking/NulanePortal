import { buildReportMapMetadata } from "./reportMap";
import { resolveReportMedia } from "./reportMedia";
import type { ReportDamageApiRow, RsaReportApiRow } from "./types";

export type ReportGallery = {
  mapMetadata: ReturnType<typeof buildReportMapMetadata>;
  galleryUrls: string[];
  photoUrls: string[];
};

function normalizeRenderableUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(trimmed, "https://nulanesystems.com").toString();
    } catch {
      return "";
    }
  }
}

export function buildReportGallery(
  report: ReportDamageApiRow | RsaReportApiRow | null
): ReportGallery {
  const mapMetadata = buildReportMapMetadata(report);
  const galleryUrls: string[] = [];
  const photoUrls: string[] = [];

  // Add map as primary asset if available
  if (mapMetadata?.mapImageUrl) {
    galleryUrls.push(mapMetadata.mapImageUrl);
  }

  if (!report) {
    return { mapMetadata, galleryUrls, photoUrls };
  }

  const media = resolveReportMedia(report as unknown as Record<string, unknown>, null);
  media.photoUrls.forEach((url) => {
    const normalized = normalizeRenderableUrl(url);
    if (normalized) {
      photoUrls.push(normalized);
      galleryUrls.push(normalized);
    }
  });
  media.splatUrls.forEach((url) => {
    if (url && !galleryUrls.includes(url)) {
      galleryUrls.push(url);
    }
  });

  return {
    mapMetadata,
    galleryUrls,
    photoUrls,
  };
}
