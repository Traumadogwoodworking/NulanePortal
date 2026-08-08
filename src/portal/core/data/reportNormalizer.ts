import { normalizeMediaUrl } from "@/lib/config";
import { getInspectionTypeLabel, normalizeSearchText } from "@/lib/reportFilters";

type UnknownRecord = Record<string, unknown>;

export type NormalizedReportListRow = {
  id: string;
  reportId: string;
  sourceType: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  inspectionTypeNumber: string;
  inspectionTypeLabel: string;
  moduleKey: string;
  facilityId: string;
  facilityName: string;
  yardId: string;
  yardName: string;
  locationLabel: string;
  status: string;
  damageStatus: string;
  scanStatus: string;
  inspectorName: string;
  inspectorEmail: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  comments: string;
  bayLocation: string;
  inventoryBay: string;
  confirmedBay: string;
  sector: string;
  photoCount: number;
  hasPhotos: boolean;
  hasPdf: boolean;
  hasSplat: boolean;
  thumbnailUrl: string;
  photoUrls: string[];
  splatUrls: string[];
  pdfUrl: string;
  raw: UnknownRecord;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function firstRecord(...values: unknown[]): UnknownRecord | null {
  for (const value of values) {
    const record = asRecord(value);
    if (record) return record;
  }
  return null;
}

function isTrueValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") return ["true", "yes", "1"].includes(value.trim().toLowerCase());
  if (typeof value === "number") return value === 1;
  return false;
}

function isFalseValue(value: unknown): boolean {
  if (value === false) return true;
  if (typeof value === "string") return ["false", "no", "0"].includes(value.trim().toLowerCase());
  if (typeof value === "number") return value === 0;
  return false;
}

function splitMaybeStringArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function readUrlFromValue(value: unknown): string {
  if (typeof value === "string") return normalizeMediaCandidate(value);
  const record = asRecord(value);
  if (!record) return "";
  return normalizeMediaCandidate(firstString(record.url, record.uri, record.path, record.href, record.signedUrl, record.signed_url));
}

function looksLikeRawStorageKey(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && !/^https?:\/\//i.test(trimmed) && !/^data:/i.test(trimmed) && !trimmed.startsWith("/");
}

function normalizeMediaCandidate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (looksLikeRawStorageKey(trimmed) && process.env.NODE_ENV !== "production") {
    console.warn("[reportNormalizer] media field is not an HTTP URL; backend should return a signed/renderable URL", {
      value: trimmed,
    });
  }
  return normalizeMediaUrl(trimmed);
}

function collectUrls(...values: unknown[]): string[] {
  const urls = values.flatMap((value) => splitMaybeStringArray(value).map(readUrlFromValue)).filter(Boolean);
  return Array.from(new Set(urls));
}

function collectDamageEntryPhotoUrls(entries: unknown[]): string[] {
  return entries.flatMap((entry) => {
    const record = asRecord(entry);
    if (!record) return [];
    return collectUrls(record.photoUrls, record.photo_urls, record.photos, record.media);
  });
}

function readNestedMedia(row: UnknownRecord) {
  const media = asRecord(row.media);
  const mediaPayload = asRecord(row.mediaPayload) ?? asRecord(row.media_payload);
  return { media, mediaPayload };
}

function normalizeInspectionTypeNumber(row: UnknownRecord, payload: UnknownRecord | null, nestedReport: UnknownRecord | null): string {
  const raw = firstString(
    row.inspectionTypeNumber,
    row.inspection_type_number,
    row.inspectionType,
    row.inspection_type,
    payload?.inspectionTypeNumber,
    payload?.inspection_type_number,
    nestedReport?.inspectionTypeNumber,
    nestedReport?.inspection_type_number
  );
  const numeric = normalizeSearchText(raw).replace(/\D+/g, "").replace(/^0+/, "");
  return numeric ? numeric.padStart(2, "0") : raw;
}

export function normalizeReportListRow(input: unknown): NormalizedReportListRow {
  const row = asRecord(input) ?? {};
  const payload = asRecord(row.payload);
  const nestedReport = asRecord(row.report);
  const metadata = asRecord(row.metadata);
  const payloadMetadata = asRecord(payload?.metadata);
  const nestedReportMetadata = asRecord(nestedReport?.metadata);
  const location = firstRecord(row.location, payload?.location, nestedReport?.location, metadata?.location, payloadMetadata?.location, nestedReportMetadata?.location);
  const vehicle = firstRecord(
    row.vehicle,
    payload?.vehicle,
    nestedReport?.vehicle,
    metadata?.vehicle,
    payloadMetadata?.vehicle,
    nestedReportMetadata?.vehicle
  );
  const overview = firstRecord(
    row.overview,
    payload?.overview,
    nestedReport?.overview,
    metadata?.overview,
    payloadMetadata?.overview,
    nestedReportMetadata?.overview
  );
  const { media, mediaPayload } = readNestedMedia(row);
  const damageEntries =
    asArray(row.damageEntries).length
      ? asArray(row.damageEntries)
      : asArray(row.damage_entries).length
        ? asArray(row.damage_entries)
        : asArray(payload?.damageEntries).length
          ? asArray(payload?.damageEntries)
          : asArray(payload?.damage_entries).length
            ? asArray(payload?.damage_entries)
            : asArray(nestedReport?.damageEntries).length
              ? asArray(nestedReport?.damageEntries)
              : asArray(nestedReport?.damage_entries);
  const reportId = firstString(row.reportId, row.report_id, row.id, nestedReport?.reportId, nestedReport?.report_id);
  const submittedAt = firstString(
    row.submittedAt,
    row.submitted_at,
    row.createdAt,
    row.created_at,
    payload?.submittedAt,
    payload?.submitted_at,
    nestedReport?.submittedAt,
    nestedReport?.submitted_at,
    metadata?.submittedAt,
    metadata?.submitted_at
  );
  const createdAt = firstString(
    row.createdAt,
    row.created_at,
    row.submittedAt,
    row.submitted_at,
    payload?.createdAt,
    payload?.created_at,
    nestedReport?.createdAt,
    nestedReport?.created_at,
    row.updatedAt,
    row.updated_at
  );
  const updatedAt = firstString(
    row.updatedAt,
    row.updated_at,
    payload?.updatedAt,
    payload?.updated_at,
    nestedReport?.updatedAt,
    nestedReport?.updated_at,
    row.createdAt,
    row.created_at
  );
  const photoUrls = Array.from(
    new Set([
      ...collectUrls(row.photoUrls, row.photo_urls, row.photos, media?.photoUrls, media?.photo_urls, mediaPayload?.photoUrls, mediaPayload?.photo_urls),
      ...collectDamageEntryPhotoUrls(damageEntries),
    ])
  );
  const splatUrls = collectUrls(row.splatUrls, row.splat_urls, media?.splatUrls, media?.splat_urls, mediaPayload?.splatUrls, mediaPayload?.splat_urls);
  const pdfUrl = collectUrls(
    row.pdfUrl,
    row.pdf_url,
    row.report_pdf_url,
    row.pdf_url_original,
    media?.pdfUrl,
    media?.pdf_url,
    mediaPayload?.pdfUrl,
    mediaPayload?.pdf_url,
    mediaPayload?.pdfUrls,
    mediaPayload?.pdf_urls
  )[0] ?? "";
  const inspectionTypeNumber = normalizeInspectionTypeNumber(row, payload, nestedReport);
  const inspectionTypeLabel = firstString(
    row.inspectionTypeLabel,
    row.inspection_type_label,
    row.inspectionLabel,
    row.inspection_label,
    inspectionTypeNumber ? getInspectionTypeLabel(inspectionTypeNumber) : ""
  );
  const make = firstString(
    row.make,
    row.vehicleMake,
    row.vehicle_make,
    payload?.make,
    payload?.vehicleMake,
    payload?.vehicle_make,
    nestedReport?.make,
    nestedReport?.vehicleMake,
    nestedReport?.vehicle_make,
    metadata?.make,
    metadata?.vehicleMake,
    metadata?.vehicle_make,
    vehicle?.make,
    vehicle?.manufacturer
  );
  const model = firstString(
    row.model,
    row.vehicleModel,
    row.vehicle_model,
    payload?.model,
    payload?.vehicleModel,
    payload?.vehicle_model,
    nestedReport?.model,
    nestedReport?.vehicleModel,
    nestedReport?.vehicle_model,
    metadata?.model,
    metadata?.vehicleModel,
    metadata?.vehicle_model,
    vehicle?.model
  );
  const year = firstString(
    row.year,
    row.modelYear,
    row.model_year,
    payload?.year,
    payload?.modelYear,
    payload?.model_year,
    nestedReport?.year,
    nestedReport?.modelYear,
    nestedReport?.model_year,
    metadata?.year,
    vehicle?.year,
    vehicle?.modelYear,
    vehicle?.model_year
  );
  const inventoryBay = firstString(
    row.inventoryBay,
    row.inventory_bay,
    payload?.inventoryBay,
    payload?.inventory_bay,
    nestedReport?.inventoryBay,
    nestedReport?.inventory_bay,
    metadata?.inventoryBay,
    metadata?.inventory_bay,
    overview?.inventoryBay,
    overview?.inventory_bay
  );
  const confirmedBay = firstString(
    row.confirmedBay,
    row.confirmed_bay,
    payload?.confirmedBay,
    payload?.confirmed_bay,
    nestedReport?.confirmedBay,
    nestedReport?.confirmed_bay,
    metadata?.confirmedBay,
    metadata?.confirmed_bay,
    overview?.confirmedBay,
    overview?.confirmed_bay
  );
  const bayLocation = firstString(
    row.bayLocation,
    row.bay_location,
    overview?.bayLocation,
    overview?.bay_location,
    payload?.bayLocation,
    payload?.bay_location,
    nestedReport?.bayLocation,
    nestedReport?.bay_location,
    confirmedBay,
    inventoryBay
  );
  const sector = firstString(
    row.sector,
    payload?.sector,
    nestedReport?.sector,
    metadata?.sector,
    overview?.sector
  );
  const comments = firstString(
    row.comments,
    payload?.comments,
    nestedReport?.comments,
    overview?.comments,
    metadata?.comments
  );
  const facilityName = firstString(
    row.facilityName,
    row.facility_name,
    row.facility,
    row.location,
    row.locationLabel,
    row.location_label,
    row.navigation,
    metadata?.facilityName,
    metadata?.facility_name,
    metadata?.facility,
    metadata?.locationLabel,
    metadata?.location_label,
    metadata?.locationName,
    metadata?.location_name,
    metadata?.navigation,
    payloadMetadata?.facilityName,
    payloadMetadata?.facility_name,
    payloadMetadata?.facility,
    payloadMetadata?.locationLabel,
    payloadMetadata?.location_label,
    payloadMetadata?.locationName,
    payloadMetadata?.location_name,
    payloadMetadata?.navigation,
    nestedReportMetadata?.facilityName,
    nestedReportMetadata?.facility_name,
    nestedReportMetadata?.facility,
    nestedReportMetadata?.locationLabel,
    nestedReportMetadata?.location_label,
    nestedReportMetadata?.locationName,
    nestedReportMetadata?.location_name,
    nestedReportMetadata?.navigation,
    location?.facilityName,
    location?.facility_name,
    location?.facility,
    location?.locationLabel,
    location?.location_label,
    location?.locationName,
    location?.location_name,
    location?.navigation
  );
  const locationLabel = firstString(
    row.locationLabel,
    row.location_label,
    row.locationName,
    row.location_name,
    row.navigation,
    metadata?.locationLabel,
    metadata?.location_label,
    metadata?.locationName,
    metadata?.location_name,
    metadata?.navigation,
    payloadMetadata?.locationLabel,
    payloadMetadata?.location_label,
    payloadMetadata?.locationName,
    payloadMetadata?.location_name,
    payloadMetadata?.navigation,
    nestedReportMetadata?.locationLabel,
    nestedReportMetadata?.location_label,
    nestedReportMetadata?.locationName,
    nestedReportMetadata?.location_name,
    nestedReportMetadata?.navigation,
    facilityName
  );
  const yardName = firstString(
    row.yardName,
    row.yard_name,
    row.yard,
    row.yardLabel,
    row.yard_label,
    metadata?.yardName,
    metadata?.yard_name,
    metadata?.yard,
    metadata?.yardLabel,
    metadata?.yard_label,
    payloadMetadata?.yardName,
    payloadMetadata?.yard_name,
    payloadMetadata?.yard,
    payloadMetadata?.yardLabel,
    payloadMetadata?.yard_label,
    nestedReportMetadata?.yardName,
    nestedReportMetadata?.yard_name,
    nestedReportMetadata?.yard,
    nestedReportMetadata?.yardLabel,
    nestedReportMetadata?.yard_label,
    location?.yardName,
    location?.yard_name,
    location?.yard,
    location?.yardLabel,
    location?.yard_label
  );
  const rawSourceType = firstString(
    row.sourceType,
    row.source_type,
    row.entry_kind,
    row.source,
    row.type,
    payload?.sourceType,
    payload?.source_type,
    payload?.entry_kind,
    nestedReport?.sourceType,
    nestedReport?.source_type,
    nestedReport?.entry_kind
  );
  const isInspectionScan =
    inspectionTypeNumber === "02" ||
    rawSourceType === "inspection_scan" ||
    rawSourceType === "inspection_scan_submission" ||
    row.entry_kind === "inspection_scan";
  const hasExplicitClearSignal =
    isTrueValue(row.clean) ||
    isTrueValue(payload?.clean) ||
    isTrueValue(nestedReport?.clean) ||
    isFalseValue(row.damage_found) ||
    isFalseValue(row.damageFound) ||
    isFalseValue(payload?.damage_found) ||
    isFalseValue(payload?.damageFound) ||
    isFalseValue(nestedReport?.damage_found) ||
    isFalseValue(nestedReport?.damageFound) ||
    firstString(
      row.damage_status,
      row.damageStatus,
      payload?.damage_status,
      payload?.damageStatus,
      nestedReport?.damage_status,
      nestedReport?.damageStatus
    ) === "no_damage";
  const isClearInspectionScan = isInspectionScan && !damageEntries.length && hasExplicitClearSignal;
  const damageStatus = firstString(
    row.damageStatus,
    row.damage_status,
    row.damageResult,
    row.damage_result,
    payload?.damageStatus,
    payload?.damage_status,
    nestedReport?.damageStatus,
    nestedReport?.damage_status,
    damageEntries.length ? "damage" : "",
    isClearInspectionScan ? "no_damage" : ""
  );
  const scanStatus = firstString(
    row.scanStatus,
    row.scan_status,
    row.status,
    payload?.scanStatus,
    payload?.scan_status,
    nestedReport?.scanStatus,
    nestedReport?.scan_status,
    isClearInspectionScan ? "completed" : ""
  );
  const sourceType = firstString(rawSourceType, isInspectionScan ? "inspection_scan_submission" : "damage_report");
  const photoCountValue = Number(firstString(row.photoCount, row.photo_count, row.mediaPhotoCount, row.media_photo_count));
  const photoCount = Number.isFinite(photoCountValue) && photoCountValue > 0 ? photoCountValue : photoUrls.length;
  const thumbnailUrl = firstString(
    collectUrls(row.thumbnailUrl, row.thumbnail_url, media?.thumbnailUrl, media?.thumbnail_url, mediaPayload?.thumbnailUrl, mediaPayload?.thumbnail_url)[0],
    photoUrls[0],
    splatUrls[0]
  );

  return {
    id: reportId || firstString(row.id),
    reportId,
    sourceType,
    vin: firstString(row.vin, row.vehicleVin, row.vehicle_vin, payload?.vin, nestedReport?.vin, vehicle?.vin),
    make,
    model,
    year,
    inspectionTypeNumber,
    inspectionTypeLabel,
    moduleKey: firstString(row.moduleKey, row.module_key, payload?.moduleKey, payload?.module_key),
    facilityId: firstString(row.facilityId, row.facility_id, row.locationId, row.location_id, metadata?.facilityId, metadata?.facility_id, metadata?.locationId, metadata?.location_id, payloadMetadata?.facilityId, payloadMetadata?.facility_id, payloadMetadata?.locationId, payloadMetadata?.location_id, nestedReportMetadata?.facilityId, nestedReportMetadata?.facility_id, nestedReportMetadata?.locationId, nestedReportMetadata?.location_id, location?.facilityId, location?.facility_id, location?.locationId, location?.location_id),
    facilityName,
    yardId: firstString(row.yardId, row.yard_id, metadata?.yardId, metadata?.yard_id, payloadMetadata?.yardId, payloadMetadata?.yard_id, nestedReportMetadata?.yardId, nestedReportMetadata?.yard_id, location?.yardId, location?.yard_id),
    yardName,
    locationLabel,
    status: firstString(
      row.status,
      row.scan_status,
      row.scanStatus,
      payload?.status,
      nestedReport?.status,
      isClearInspectionScan ? "complete" : "open"
    ),
    damageStatus,
    scanStatus,
    inspectorName: firstString(
      row.inspectorName,
      row.inspector_name,
      row.inspector,
      row.userName,
      row.user_name,
      payload?.inspectorName,
      payload?.inspector_name,
      nestedReport?.inspectorName,
      nestedReport?.inspector_name,
      metadata?.inspectorName,
      metadata?.inspector_name
    ),
    inspectorEmail: firstString(
      row.inspectorEmail,
      row.inspector_email,
      row.userEmail,
      row.user_email,
      row.submittedByEmail,
      row.submitted_by_email,
      payload?.inspectorEmail,
      payload?.inspector_email,
      payload?.submittedByEmail,
      payload?.submitted_by_email,
      nestedReport?.inspectorEmail,
      nestedReport?.inspector_email,
      nestedReport?.submittedByEmail,
      nestedReport?.submitted_by_email,
      metadata?.inspectorEmail,
      metadata?.inspector_email
    ),
    submittedAt,
    createdAt,
    updatedAt,
    comments,
    bayLocation,
    inventoryBay,
    confirmedBay,
    sector,
    photoCount,
    hasPhotos: photoCount > 0,
    hasPdf: Boolean(pdfUrl),
    hasSplat: splatUrls.length > 0,
    thumbnailUrl,
    photoUrls,
    splatUrls,
    pdfUrl,
    raw: row,
  };
}

export function normalizeReportListRows(rows: unknown[]): NormalizedReportListRow[] {
  return rows.map(normalizeReportListRow).filter((row) => row.id || row.reportId);
}
