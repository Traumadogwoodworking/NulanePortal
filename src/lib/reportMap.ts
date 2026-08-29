import type { ReportDamageApiRow, RsaReportApiRow } from "./types";

export type ReportMapMetadata = {
  lat: number;
  lon: number;
  embedUrl: string;
  mapLink: string;
  mapImageUrl: string;
};

type CoordinatePair = { latitude: number; longitude: number };

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRecord(value?: unknown | null): Record<string, unknown> | undefined {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function resolveLocationCandidates(report: ReportDamageApiRow | RsaReportApiRow | null) {
  const damage = report as ReportDamageApiRow | null;
  const rsa = report as RsaReportApiRow | null;
  const base = report as unknown as Record<string, unknown>;
  const overview = base["overview"] as Record<string, unknown> | undefined;
  const payload = base["payload"] as Record<string, unknown> | undefined;
  const reportNested = base["report"] as Record<string, unknown> | undefined;
  const railcarScan = base["railcar_scan"] as Record<string, unknown> | undefined;
  const candidates: (Record<string, unknown> | undefined)[] = [
    toRecord(base["location"]),
    toRecord(overview?.["location"]),
    toRecord(payload?.["location"]),
    toRecord(reportNested?.["location"]),
    toRecord(railcarScan?.["location"]),
    toRecord(damage?.payload),
    toRecord(damage?.report),
    toRecord(damage?.railcar_scan),
    toRecord(rsa?.payload),
    toRecord(rsa?.report),
    toRecord(rsa?.railcar_scan),
  ];
  return candidates.filter(Boolean) as Record<string, unknown>[];
}

export function resolveReportCoordinates(
  report: ReportDamageApiRow | RsaReportApiRow | null
): CoordinatePair | null {
  if (!report) {
    return null;
  }
  const candidates = resolveLocationCandidates(report);
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const lat = parseCoordinate(candidate.latitude ?? candidate.lat);
    const lon = parseCoordinate(candidate.longitude ?? candidate.lon ?? candidate.lng);
    if (lat !== null && lon !== null) {
      return { latitude: lat, longitude: lon };
    }
  }

  return null;
}

export function buildReportMapMetadata(
  report: ReportDamageApiRow | RsaReportApiRow | null
): ReportMapMetadata | null {
  const coords = resolveReportCoordinates(report);
  if (!coords) {
    return null;
  }
  const { latitude: lat, longitude: lon } = coords;
  const delta = 0.0035;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&marker=${lat},${lon}`;
  const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`;
  const mapImageUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=640x360&maptype=mapnik&markers=${lat},${lon},lightblue1`;
  return { lat, lon, embedUrl, mapLink, mapImageUrl };
}
