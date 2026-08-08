import {
  FacilitySummary,
  LocationSummary,
  NotificationSummary,
  ReportSummary,
  RoleCatalog,
  UserSummary,
  FacilityAssignment,
} from "./types";

export const sampleFacilities: FacilitySummary[] = [
  {
    id: "awct",
    name: "AWCT Logistics",
    slug: "awct",
    region: "Northeast",
    active: true,
    locationCount: 12,
  },
  {
    id: "interrail",
    name: "Inter-Rail Depot",
    slug: "inter",
    region: "Midwest",
    active: true,
    locationCount: 8,
  },
  {
    id: "legacy",
    name: "Legacy Harbor",
    slug: "legacy",
    region: "South",
    active: false,
    locationCount: 3,
  },
];

export const sampleLocations: LocationSummary[] = [
  { id: "loc-1", name: "Bay 4", facilityId: "awct", city: "Long Beach", state: "CA" },
  { id: "loc-2", name: "Track A", facilityId: "awct", city: "Long Beach", state: "CA" },
  { id: "loc-3", name: "Bay 9", facilityId: "interrail", city: "Chicago", state: "IL" },
];

export const sampleReports: ReportSummary[] = [
  {
    id: "report-damage-1",
    title: "Damage Report 7234",
    facilityId: "awct",
    facilityName: "AWCT Logistics",
    type: "damage",
    status: "open",
    locationName: "Bay 4",
    createdAt: "2026-03-17T14:45:00Z",
    severity: "high",
  },
  {
    id: "report-damage-2",
    title: "Damage Report 7291",
    facilityId: "interrail",
    facilityName: "Inter-Rail Depot",
    type: "damage",
    status: "review",
    locationName: "Bay 9",
    createdAt: "2026-03-16T11:28:00Z",
    severity: "medium",
  },
  {
    id: "report-rsa-1",
    title: "RSA Inspection 2026-03-16",
    facilityId: "awct",
    facilityName: "AWCT Logistics",
    type: "rsa",
    status: "closed",
    locationName: "Track A",
    createdAt: "2026-03-16T08:10:00Z",
    severity: "low",
  },
];

export const sampleNotifications: NotificationSummary[] = [
  {
    id: "note-1",
    title: "DocuFit sync healthy",
    body: "Last sync with /docufit/api/milestones completed 4 minutes ago.",
    severity: "success",
    timestamp: "2026-03-22T13:14:00Z",
  },
  {
    id: "note-2",
    title: "Auth0 token expiring",
    body: "Portal auth token has less than 5 minutes remaining. Refresh to avoid redirect.",
    severity: "warning",
    timestamp: "2026-03-22T13:05:00Z",
  },
];

export const sampleUsers: UserSummary[] = [
  {
    id: "user-snide",
    name: "Snide WorkBook1",
    email: "snide@workbook1.local",
    role: "admin",
    isActive: true,
    facilityIds: ["awct", "interrail"],
    permissions: [
      "portal.admin",
      "portal.dashboard.view",
      "portal.reports.view",
      "portal.facilities.manage",
      "portal.people.view",
    ],
    lastUpdated: "2026-03-22T12:00:00Z",
  },
  {
    id: "user-lee",
    name: "Lee Inspector",
    email: "lee@awct.inc",
    role: "user",
    isActive: true,
    facilityIds: ["awct"],
    permissions: ["portal.dashboard.view", "portal.reports.view"],
    lastUpdated: "2026-03-21T16:08:00Z",
  },
  {
    id: "user-cam",
    name: "Cam Admin",
    email: "cam@interrail.inc",
    role: "admin",
    isActive: false,
    facilityIds: ["interrail"],
    permissions: ["portal.admin"],
    lastUpdated: "2026-03-18T08:42:00Z",
  },
];

export const sampleRoleCatalog: RoleCatalog[] = [
  {
    key: "portal.admin",
    name: "Portal Admin",
    description: "Full access to portal administration and user management.",
    scope: "organization",
    permissions: ["portal.admin"],
    status: "active",
  },
  {
    key: "portal.facilities.manage",
    name: "Facility Manager",
    description: "Manage facilities and location assignments for scoped sites.",
    scope: "facility",
    permissions: ["portal.facilities.manage", "portal.people.view"],
    status: "active",
  },
  {
    key: "portal.reports.view",
    name: "Reporter",
    description: "View damage and RSA reports across assigned facilities.",
    scope: "location",
    permissions: ["portal.reports.view", "portal.dashboard.view"],
    status: "active",
  },
];

export const sampleFacilityAssignments: FacilityAssignment[] = [
  { userId: "user-snide", facilityIds: ["awct", "interrail"], roleKey: "portal.admin" },
  { userId: "user-lee", facilityIds: ["awct"], roleKey: "portal.reports.view" },
  { userId: "user-cam", facilityIds: ["interrail"], roleKey: "portal.facilities.manage" },
];
