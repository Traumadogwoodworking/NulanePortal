export type RoleKey = "super_admin" | "admin" | "org_admin" | "facility_admin" | "user" | "viewer";

export interface FacilityYardArea {
  areaId: string;
  name: string;
  active: boolean;
}

export interface FacilityYard {
  yardId: string;
  name: string;
  code: string;
  active: boolean;
  areas: FacilityYardArea[];
}

export interface FacilitySummary {
  id: string;
  name: string;
  slug: string;
  region?: string;
  active: boolean;
  locationCount: number;
  yards?: FacilityYard[];
}

export interface LocationSummary {
  id: string;
  name: string;
  facilityId: string;
  city: string;
  state: string;
}

export interface PortalSessionLocation {
  location_id: string;
  organization_id?: string;
  location_name?: string;
  location_label?: string;
  display_name?: string;
  yards?: unknown[];
  yard_options?: unknown[];
  yardOptions?: unknown[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  status?: string;
  isActive: boolean;
  facilityIds: string[];
  permissions: string[];
  lastLogin?: string | null;
  lastUpdated: string;
  createdAt?: string;
}

export interface DeletedUserSummary extends UserSummary {
  organizationMembership: OrganizationMembership | null;
  locationMemberships: LocationMembership[];
  deletedAt?: string | null;
  deactivatedAt?: string | null;
  suspendedAt?: string | null;
  isDeleted?: boolean;
  isDeactivated?: boolean;
  isSuspended?: boolean;
}

export interface PortalUserRecord {
  id?: string;
  user_id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  organization_id?: string;
  status?: string;
  is_active?: boolean;
  is_free_user?: boolean;
  show_ads?: boolean;
  permissions?: string[];
  organization_membership?: OrganizationMembership | null;
  location_memberships?: LocationMembership[];
  facility_ids?: string[];
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PortalOrganization {
  organization_id: string;
  name?: string;
  type?: string;
  suborg?: string;
}

export interface PortalSessionResponse {
  user: PortalUserRecord;
  organization: PortalOrganization | null;
  plan_tier?: string;
  portal_access?: boolean;
  organization_type?: string;
  requires_ads?: boolean;
  locations?: PortalSessionLocation[];
  facilities?: PortalSessionLocation[];
  available_locations?: PortalSessionLocation[];
  availableLocations?: PortalSessionLocation[];
  available_facilities?: PortalSessionLocation[];
  availableFacilities?: PortalSessionLocation[];
  selected_location?: PortalSessionLocation | null;
  location_locked?: boolean;
  branding_snapshot?: Record<string, unknown>;
  message?: string;
  timestamp?: string;
  is_admin?: boolean;
}

export interface OrganizationMembership {
  membership_id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_primary: boolean;
  is_active: boolean;
  membership_metadata?: Record<string, unknown>;
  updated_at?: string;
}

export interface LocationMembership {
  location_membership_id: string;
  location_id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  is_primary: boolean;
  membership_metadata?: Record<string, unknown>;
  updated_at?: string;
}

export interface EmailListSummary {
  email_list_id: string;
  list_key?: string;
  list_name: string;
  list_type?: string;
  location_id?: string;
  is_active?: boolean;
  metadata?: {
    description?: string;
    [key: string]: unknown;
  };
}

export interface EmailListMemberSummary {
  email_list_member_id: string;
  email_list_id: string;
  email: string;
  user_id?: string;
  display_name?: string;
  member_type?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export type DeliveryRuleCategory = "facility" | "general" | "custom";
export type DeliveryRuleTriggerKind = "facility" | "damage" | "facility_and_damage";

export interface DeliveryRuleEmailActions {
  cc: string[];
  bcc: string[];
}

export interface DeliveryRuleFacilitySelection {
  facilityId: string;
  facilityName?: string;
}

export interface DeliveryRuleDamageSelectionItem {
  id: string;
  code: string;
  label: string;
}

export interface DeliveryRuleDamageSelection {
  area?: DeliveryRuleDamageSelectionItem | null;
  damageType?: DeliveryRuleDamageSelectionItem | null;
  severity?: DeliveryRuleDamageSelectionItem | null;
}

export interface DeliveryRuleSource {
  kind: string;
  legacyId?: string;
  readOnly?: boolean;
  migrationRequired?: boolean;
  displayLabel: string;
}

export interface DeliveryRule {
  id: string;
  organizationId: string;
  name: string;
  enabled: boolean;
  category: DeliveryRuleCategory;
  triggerKind: DeliveryRuleTriggerKind;
  facilityTrigger: DeliveryRuleFacilitySelection | null;
  damageTrigger: DeliveryRuleDamageSelection | null;
  actions: DeliveryRuleEmailActions;
  source: DeliveryRuleSource;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryRuleAreaOption {
  id: string;
  code: string;
  label: string;
}

export interface DeliveryRuleDamageTypeOption {
  id: string;
  code: string;
  label: string;
}

export interface DeliveryRuleSeverityOption {
  id: string;
  code: string;
  label: string;
}

export interface DeliveryRuleOptions {
  organizationId: string;
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    locationId?: string;
    locationName?: string;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  }>;
  damageTaxonomy: {
    area: DeliveryRuleAreaOption[];
    damageType: DeliveryRuleDamageTypeOption[];
    severity: DeliveryRuleSeverityOption[];
  };
}

export interface DeliveryRulePreviewPayload {
  name: string;
  enabled: boolean;
  category: DeliveryRuleCategory;
  triggerKind: DeliveryRuleTriggerKind;
  facilityTrigger: DeliveryRuleFacilitySelection | null;
  damageTrigger: DeliveryRuleDamageSelection | null;
  actions: DeliveryRuleEmailActions;
}

export type ReportStatus = "open" | "review" | "closed" | "verified" | "archived";
export type ReportType = "damage" | "rsa";

export type ReportSeverity = "low" | "medium" | "high" | string;

export interface ReportDamageEntry {
  damage_entry_id?: string;
  damage_sequence?: number;
  damage_area?: string;
  damage_type?: string;
  damage_area_code?: string;
  damage_type_code?: string;
  severity?: ReportSeverity;
  comments?: string;
  photos?: Array<Record<string, unknown>>;
  created_at?: string;
  updated_at?: string;
}

export interface ReportOverview {
  report_id?: string;
  comments?: string;
  bay_location?: string;
  navigation?: string;
  navigation_text?: string;
  navigationText?: string;
  navigationInstructions?: string;
  metadata?: Record<string, unknown>;
  pdf_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportLocationInfo {
  location_id?: string;
  location_label?: string;
  location_name?: string;
  facility?: string;
  facility_id?: string;
  navigation?: string;
}

export interface ReportDamageApiRow {
  report_id: string;
  organization_id?: string;
  organization_name?: string;
  organization_type?: string;
  organization_suborg?: string;
  user_uuid?: string;
  vin?: string;
  inspection_type_number?: string | number;
  make?: string;
  model?: string;
  year?: number;
  status?: ReportStatus;
  inspector_email?: string;
  location_id?: string;
  facility_id?: string;
  location_label?: string;
  location_name?: string;
  facility?: string;
  navigation?: string;
  yard?: string;
  yard_id?: string;
  yard_name?: string;
  yard_label?: string;
  comments?: string;
  photo_urls?: Array<string>;
  splat_urls?: Array<string>;
  splatImageUrl?: string;
  pdf_url?: string;
  overview?: ReportOverview | null;
  damage_entries?: ReportDamageEntry[];
  location?: ReportLocationInfo | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  payload?: Record<string, unknown>;
  report?: Record<string, unknown>;
  railcar_scan?: Record<string, unknown>;
  damage_summary?: Array<Record<string, unknown>>;
}

export interface ReportsResponse {
  vin: string;
  reports: ReportDamageApiRow[];
}

export interface RsaReportApiRow {
  report_id: string;
  organization_id?: string;
  user_id?: string;
  inspector_email?: string;
  rail_car_number?: string;
  template_key?: string;
  subject?: string;
  recipients?: string[];
  report?: Record<string, unknown>;
  damage_summary?: Array<Record<string, unknown>>;
  railcar_scan?: Record<string, unknown>;
  branding_snapshot?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  track?: string | null;
  spot?: string | null;
  location_id?: string;
  facility_id?: string;
  location_label?: string;
  location_name?: string;
  facility?: string;
  navigation?: string;
  location?: ReportLocationInfo | null;
  created_at?: string;
  updated_at?: string;
  cars?: Array<Record<string, unknown>>;
}

export interface RsaReportsResponse {
  reports: RsaReportApiRow[];
}

export type ReportFilterKey =
  | "report_id"
  | "id"
  | "organization_id"
  | "org_id"
  | "user_uuid"
  | "vin"
  | "make"
  | "model"
  | "inspector_email"
  | "status"
  | "year";

export type ReportFilters = Partial<Record<ReportFilterKey, string | number>>;

export interface ReportSummary {
  id: string;
  type: ReportType;
  status: ReportStatus;
  title?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  inspectorEmail?: string;
  locationName?: string;
  facilityName?: string;
  facilityId?: string;
  facilityMatchKeys?: string[];
  severity?: ReportSeverity;
  createdAt?: string;
  updatedAt?: string;
  track?: string | null;
  spot?: string | null;
  cars?: Array<Record<string, unknown>>;
  payload?: Record<string, unknown>;
}

export type NotificationSeverity = "info" | "warning" | "danger" | "success";

export interface NotificationSummary {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  timestamp: string;
}

export interface RoleCatalog {
  key: string;
  name: string;
  description: string;
  scope: "organization" | "facility" | "location";
  permissions: string[];
  status: "active" | "archived";
}

export interface FacilityAssignment {
  userId: string;
  facilityIds: string[];
  roleKey: string;
  locationIds?: string[];
}

export interface UsersListResponse {
  users: UserSummary[];
}

export interface FacilitiesListResponse {
  facilities: FacilitySummary[];
}

export interface FacilityAssignmentsResponse {
  assignments: FacilityAssignment[];
}

export interface LocationsByFacilityResponse {
  facilityId: string;
  locations: LocationSummary[];
}

export interface DocuFitHealthResponse {
  status?: string;
  message?: string;
  detail?: string;
  uptime?: string;
  timestamp?: string;
}

export interface BrandingSnapshot {
  organization_id?: string;
  organization_name?: string;
  brand_name?: string;
  logo_url?: string;
  powered_by_logo_path?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  button_color?: string;
  background_color?: string;
  text_color?: string;
  border_color?: string;
  error_color?: string;
  success_color?: string;
  warning_color?: string;
  font_family?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  website_url?: string;
  email_signature?: string;
  email_footer?: string;
  is_dark_mode?: boolean;
  portal_access?: boolean;
  current_tier?: string;
  last_payment_at?: string;
  updated_at?: string;
  color_swatch?: Record<string, string>;
  custom_theme_data?: Record<string, unknown>;
  email_templates?: Record<string, unknown>;
}
