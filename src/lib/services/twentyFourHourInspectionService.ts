import { apiFetch } from "@/lib/apiClient";

const TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT = "/inspection/24-hour/portal-display";

export type TwentyFourHourInspectionRow = {
  vin?: string | null;
  bucket?: string | null;
  severity?: string | null;
  display_label?: string | null;
  display_background?: string | null;
  display_text_color?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  age_hours?: number | string | null;
  inspected_at?: string | null;
  inspector?: string | null;
  user?: string | null;
  report_id?: string | null;
  reportId?: string | null;
  source_csv_date?: string | null;
  source_import_id?: string | null;
  organization_id?: string | null;
  organization_suborg?: string | null;
  yard?: string | null;
  yard_id?: string | null;
  yard_name?: string | null;
  yard_label?: string | null;
  facility?: string | null;
  facility_id?: string | null;
  location_id?: string | null;
  location_label?: string | null;
  location_name?: string | null;
};

export type TwentyFourHourInspectionResponse = {
  ok?: boolean;
  inspection_type?: string;
  generated_at?: string;
  archive_window_days?: number;
  totals?: {
    total_active?: number;
    needs_inspected?: number;
    inspected?: number;
  };
  rows?: TwentyFourHourInspectionRow[];
};

export type TwentyFourHourInspectionParams = {
  yard?: string;
  facility_id?: string;
};

function buildQueryString(params: TwentyFourHourInspectionParams): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function fetchTwentyFourHourInspectionDisplay(
  params: TwentyFourHourInspectionParams = {}
): Promise<TwentyFourHourInspectionResponse> {
  return apiFetch<TwentyFourHourInspectionResponse>(
    `${TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT}${buildQueryString(params)}`
  );
}
