import { normalizeMediaUrl } from "@/lib/config";

function isUsableHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function firstUsableUrl(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const found = value.find(isUsableHttpUrl);
      if (found) {
        return found.trim();
      }
      continue;
    }
    if (isUsableHttpUrl(value)) {
      return value.trim();
    }
  }
  return "";
}

function collectUsableUrls(...values: unknown[]): string[] {
  const urls: string[] = [];
  values.forEach((value) => {
    if (!Array.isArray(value)) {
      return;
    }
    value.forEach((entry) => {
      if (isUsableHttpUrl(entry)) {
        urls.push(entry.trim());
      } else if (entry && typeof entry === "object") {
        const candidate = entry as {
          url?: unknown;
          uri?: unknown;
          path?: unknown;
          href?: unknown;
          photo_url?: unknown;
          photoUrl?: unknown;
          signed_url?: unknown;
          signedUrl?: unknown;
        };
        const resolved = firstUsableUrl(
          candidate.url,
          candidate.uri,
          candidate.path,
          candidate.href,
          candidate.photo_url,
          candidate.photoUrl,
          candidate.signed_url,
          candidate.signedUrl
        );
        if (resolved) {
          urls.push(resolved);
        }
      }
    });
  });
  return Array.from(new Set(urls));
}

function splitPhotoUrls(report: Record<string, unknown>): string[] {
  const damageEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const damagePhotoUrls = damageEntries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    return collectUsableUrls(record.photoUrls, record.photo_urls, record.photos);
  });
  return Array.from(
    new Set([
      ...collectUsableUrls(report.photoUrls, report.photo_urls, report.photo_urls_original, report.photos),
      ...damagePhotoUrls,
    ])
  );
}

export function resolveReportMedia(report: Record<string, unknown> | null | undefined, damage?: Record<string, unknown> | null) {
  const reportRecord = report ?? {};
  const damageRecord = damage ?? {};
  const reportMedia = reportRecord.media && typeof reportRecord.media === "object" ? (reportRecord.media as Record<string, unknown>) : {};
  const damageMedia = damageRecord.media && typeof damageRecord.media === "object" ? (damageRecord.media as Record<string, unknown>) : {};
  const reportMediaPayload =
    reportRecord.mediaPayload && typeof reportRecord.mediaPayload === "object"
      ? (reportRecord.mediaPayload as Record<string, unknown>)
      : reportRecord.media_payload && typeof reportRecord.media_payload === "object"
        ? (reportRecord.media_payload as Record<string, unknown>)
        : {};
  const damageMediaPayload =
    damageRecord.mediaPayload && typeof damageRecord.mediaPayload === "object"
      ? (damageRecord.mediaPayload as Record<string, unknown>)
      : damageRecord.media_payload && typeof damageRecord.media_payload === "object"
        ? (damageRecord.media_payload as Record<string, unknown>)
        : {};
  const photoUrls = Array.from(
    new Set([
      ...collectUsableUrls(
        damageRecord.photoUrls,
        damageRecord.photo_urls,
        damageRecord.photos,
        damageMedia.photoUrls,
        damageMedia.photo_urls,
        damageMediaPayload.photoUrls,
        damageMediaPayload.photo_urls
      ),
      ...splitPhotoUrls(reportRecord),
      ...collectUsableUrls(reportMedia.photoUrls, reportMedia.photo_urls, reportMediaPayload.photoUrls, reportMediaPayload.photo_urls),
    ])
  );
  const splatImageUrl = firstUsableUrl(
    damageRecord.splatImageUrl,
    reportRecord.splatImageUrl,
    damageMedia.splatImageUrl,
    reportMedia.splatImageUrl,
    damageRecord.splatUrls,
    reportRecord.splatUrls,
    damageMedia.splatUrls,
    reportMedia.splatUrls,
    damageMediaPayload.splatUrls,
    reportMediaPayload.splatUrls,
    damageRecord.splat_urls,
    reportRecord.splat_urls
  );
  const splatUrls = Array.from(
    new Set(
      [
        splatImageUrl,
        ...collectUsableUrls(
          damageRecord.splatUrls,
          reportRecord.splatUrls,
          damageRecord.splat_urls,
          reportRecord.splat_urls,
          damageMedia.splatUrls,
          reportMedia.splatUrls,
          damageMediaPayload.splatUrls,
          reportMediaPayload.splatUrls,
          damageMedia.splat_urls,
          reportMedia.splat_urls,
          damageMediaPayload.splat_urls,
          reportMediaPayload.splat_urls
        ),
      ]
        .map((url) => normalizeMediaUrl(url))
        .filter(Boolean)
    )
  );
  return {
    photoUrls: photoUrls.filter(Boolean),
    splatImageUrl: normalizeMediaUrl(splatImageUrl),
    splatUrls,
  };
}
