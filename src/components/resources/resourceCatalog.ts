import type { FacilityRegistrationConfiguration } from "@/lib/services/facilityOnboardingService";
import type { FacilitySummary } from "@/lib/types";
import { formatFacilityDisplayName } from "@/lib/facilityDisplay";
import { normalizeSearchText, splitSearchTokens } from "@/lib/searchText";
import {
  getFacilityQuickStartAsset,
  type FacilityQuickStartAsset,
} from "@/components/facilities/facilityQuickStartAsset";

export type ResourceAudience = "field" | "portal" | "shared";
export type ResourcePublicationStatus = "published" | "draft";
export type ResourceAccess =
  "authenticated" | "facility-admin" | "org-admin" | "super-admin";
export type ResourceCategoryId =
  | "get-started"
  | "complete-inspections"
  | "review-reports"
  | "manage-access"
  | "fix-a-problem";

export interface ResourceCategoryDefinition {
  id: ResourceCategoryId;
  title: string;
  description: string;
}

export interface ResourceGuideDefinition {
  id: string;
  title: string;
  description: string;
  category: ResourceCategoryId;
  audience: ResourceAudience;
  access: ResourceAccess;
  keywords: string[];
  publicationStatus: ResourcePublicationStatus;
  where: string;
  steps: string[];
  done: string;
  problem: string;
  problemGuideId?: string;
  referenceNote?: string;
  facilityId?: string;
  facilityName?: string;
  registrationUrl?: string;
  support?: { displayName?: string; email?: string; phone?: string };
  yards?: string[];
  quickStart?: FacilityQuickStartAsset;
}

export interface ResourceAccessContext {
  isFacilityAdmin: boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
}

export const resourceCategories: ResourceCategoryDefinition[] = [
  {
    id: "get-started",
    title: "Get Started",
    description: "Open an inspection and identify the vehicle.",
  },
  {
    id: "complete-inspections",
    title: "Complete Inspections",
    description:
      "Record damage, no-damage, rail, chock, and damage-code results.",
  },
  {
    id: "review-reports",
    title: "Review Reports",
    description: "Find submitted reports and export the results you need.",
  },
  {
    id: "manage-access",
    title: "Manage Access",
    description: "Get help, manage registration, and assign supported roles.",
  },
  {
    id: "fix-a-problem",
    title: "Fix a Problem",
    description: "Recover a report or continue when VIN scanning fails.",
  },
];

const published = (
  input: Omit<ResourceGuideDefinition, "publicationStatus">,
): ResourceGuideDefinition => ({ ...input, publicationStatus: "published" });

export const generalResourceGuides: ResourceGuideDefinition[] = [
  published({
    id: "start-an-inspection",
    title: "Start an Inspection",
    description:
      "Select the work location, open a workflow, and confirm the VIN.",
    category: "get-started",
    audience: "field",
    access: "authenticated",
    keywords: [
      "sign in",
      "login",
      "dashboard",
      "current facility",
      "workflow",
      "VIN",
      "camera",
      "manual entry",
      "17 characters",
    ],
    where: "Mobile app → Dashboard",
    steps: [
      "Sign in with the account assigned to the facility where you are working.",
      "Confirm Current Facility, then open the inspection workflow shown for that facility.",
      "Scan the VIN or use manual entry on the VIN Scanner screen.",
      "Confirm the 17-character VIN before continuing.",
    ],
    done: "The inspection opens with the correct facility and confirmed VIN.",
    problem:
      "If the facility is missing, ask a facility administrator to verify your assignment. If the scanner fails, use Fix VIN Scanning.",
    problemGuideId: "fix-vin-scanning",
  }),
  published({
    id: "complete-damage-inspection",
    title: "Complete a Damage Inspection",
    description: "Record damage or no-damage results, review, and submit.",
    category: "complete-inspections",
    audience: "field",
    access: "authenticated",
    keywords: [
      "damage",
      "no damage",
      "photo",
      "signature",
      "area",
      "type",
      "severity",
      "review report",
      "submit",
    ],
    where: "Mobile app → Dashboard → Damage Inspection",
    steps: [
      "Confirm the facility, configured yard when requested, and VIN.",
      "Choose Damage Found or No Damage Found.",
      "For damage, add each separate issue with the area, type, severity, and required readable photo.",
      "Open Review Report, complete any required signature, and correct every validation message.",
      "Submit the report.",
    ],
    done: "The app confirms submission or shows the report saved and queued for upload.",
    problem:
      "Open the field named in the validation message. If the report is saved or queued, use Recover a Saved or Queued Report instead of starting again.",
    problemGuideId: "recover-saved-or-queued-report",
  }),
  published({
    id: "complete-rail-inspection",
    title: "Complete a Rail Inspection",
    description:
      "Record railcar, vehicle-position, and chock evidence in one workflow.",
    category: "complete-inspections",
    audience: "field",
    access: "authenticated",
    keywords: [
      "rail",
      "railcar number",
      "deck A",
      "deck B",
      "vehicle spot",
      "chock system",
      "chock code",
      "jumped chock",
      "chock photo",
    ],
    where: "Mobile app → Dashboard → enabled rail inspection workflow",
    steps: [
      "Confirm the facility, configured yard when requested, and railcar number.",
      "Select deck A or B and the vehicle spot shown by the workflow.",
      "Scan or enter the VIN, then record the chock system/code.",
      "When a jumped chock is present, record the result and capture the required chock photograph.",
      "Review the entries and submit.",
    ],
    done: "The rail report is submitted with the railcar, spot, VIN, chock result, and required evidence.",
    problem:
      "If a rail field is missing, confirm that you opened the facility’s enabled rail workflow. Fix the named field before submitting.",
  }),
  published({
    id: "use-damage-codes",
    title: "Use Damage Codes",
    description:
      "Choose the area, type, and severity values available in the inspection.",
    category: "complete-inspections",
    audience: "field",
    access: "authenticated",
    keywords: [
      "damage code",
      "damage coding",
      "area",
      "type",
      "severity",
      "AIAG",
      "M-22",
    ],
    where: "Mobile app → Damage Inspection → Add damage",
    steps: [
      "Select the damaged area shown in the app.",
      "Select the damage type that matches the visible condition.",
      "Select the severity required by the workflow.",
      "Capture the required readable photo and save the entry.",
    ],
    done: "The damage entry shows an area, type, severity, and required photo.",
    problem:
      "If the needed value is not available, stop and ask the approved facility contact instead of choosing a substitute code.",
    referenceNote:
      "Inspection-Trac exposes its configured code choices in the workflow. This guide is not an independently verified reproduction of an official AIAG/M-22 reference.",
  }),
  published({
    id: "find-and-export-reports",
    title: "Find and Export Reports",
    description:
      "Locate a submitted report, review evidence, and download visible results.",
    category: "review-reports",
    audience: "portal",
    access: "authenticated",
    keywords: [
      "damage reports",
      "RSA reports",
      "submitted report",
      "VIN",
      "status",
      "date",
      "photo",
      "PDF",
      "CSV",
      "export",
      "download",
    ],
    where: "Portal → Damage Reports or RSA Reports",
    steps: [
      "Choose the report page for the workflow you need.",
      "Use the available facility, VIN, status, or date controls to narrow the list.",
      "Open a report to confirm its vehicle, facility, status, and evidence.",
      "Select the visible reports you need, then choose the available PDF or CSV download action.",
      "Open the download and confirm its report identifiers match your selection.",
    ],
    done: "The intended report is verified and the downloaded file contains the selected results.",
    problem:
      "Clear overly narrow filters and verify the facility scope. Export PDFs in smaller groups when the page limits the selection.",
  }),
  published({
    id: "get-account-or-facility-access",
    title: "Get Account or Facility Access",
    description:
      "Use the facility registration link or send support the exact access details.",
    category: "manage-access",
    audience: "shared",
    access: "authenticated",
    keywords: [
      "support",
      "access",
      "account",
      "facility",
      "assignment",
      "registration",
      "enrollment",
      "ticket",
      "login",
    ],
    where: "Portal → Resources → facility card",
    steps: [
      "Open the card for the facility you need.",
      "If registration is enabled, open its registration link and sign in or create an account with your work email.",
      "Confirm the registration page names the intended facility.",
      "If the link is unavailable or access is still missing, open Support Tickets and include the facility, account email, and exact message shown.",
    ],
    done: "The account is assigned to the intended facility, or a support ticket contains the details needed to resolve access.",
    problem:
      "Do not use a different facility’s link and never include a password, access token, or secret in a support ticket.",
  }),
  published({
    id: "manage-facility-registration",
    title: "Manage Facility Registration",
    description:
      "Review registration status and use the canonical link, QR, and quick-start guide.",
    category: "manage-access",
    audience: "portal",
    access: "facility-admin",
    keywords: [
      "admin",
      "facility",
      "registration",
      "enrollment",
      "QR",
      "quick start",
      "registration link",
      "packet",
    ],
    where: "Portal → Facilities → select a facility → Registration",
    steps: [
      "Confirm the facility name, registration link name, default role, and support details.",
      "Turn on Accept registration from this link when enrollment should be open.",
      "Save Registration and confirm the status reloads as Enabled.",
      "Use the displayed registration link, QR SVG, or downloadable quick-start guide for that facility.",
      "Open Test new session and confirm the registration page names the intended facility.",
    ],
    done: "Registration is enabled and the link, QR, and quick-start guide all open the same facility URL.",
    problem:
      "If registration is unavailable or the saved status cannot be confirmed, keep the material unpublished and open Support Tickets.",
  }),
  published({
    id: "manage-users-and-roles",
    title: "Manage Users and Roles",
    description:
      "Review an existing user and save supported role and facility assignments.",
    category: "manage-access",
    audience: "portal",
    access: "facility-admin",
    keywords: [
      "admin",
      "users",
      "roles",
      "invite",
      "assignment",
      "facility access",
    ],
    where: "Portal → Users",
    steps: [
      "Find the existing user before creating an invitation.",
      "Review the user’s current role and facility assignments.",
      "Choose only the role and facility options available in the form.",
      "Save, then reopen the user to verify the assignment.",
    ],
    done: "The user record reloads with the intended supported role and facility assignment.",
    problem:
      "Update an existing user instead of creating a duplicate. If a facility is missing, verify the organization scope.",
  }),
  published({
    id: "recover-saved-or-queued-report",
    title: "Recover a Saved or Queued Report",
    description:
      "Resume the existing report after interruption, offline save, or upload failure.",
    category: "fix-a-problem",
    audience: "field",
    access: "authenticated",
    keywords: [
      "resume report",
      "saved",
      "queued",
      "offline",
      "retry",
      "upload",
      "authentication expired",
      "needs correction",
    ],
    where: "Mobile app → Dashboard → Resume report",
    steps: [
      "Reconnect the device when the message says it is offline.",
      "Sign in again when the message says authentication expired.",
      "Open Resume report and choose the existing report by VIN or report ID.",
      "Complete the correction or retry action named by the app.",
      "Keep the app open until it confirms submission or shows that the report remains queued.",
    ],
    done: "The existing report is submitted, or its queue state clearly names the remaining action.",
    problem:
      "Do not start a second report for the same inspection. If correction is required, fix the named field or evidence item before retrying.",
  }),
  published({
    id: "fix-vin-scanning",
    title: "Fix VIN Scanning",
    description: "Restore camera permission or continue with manual VIN entry.",
    category: "fix-a-problem",
    audience: "field",
    access: "authenticated",
    keywords: [
      "scanner",
      "camera",
      "permission",
      "manual VIN",
      "hardware scanner",
      "17 characters",
      "I O Q",
    ],
    where: "Mobile app → VIN Scanner",
    steps: [
      "Allow camera access in device settings, then reopen VIN Scanner.",
      "Clean the VIN label, improve lighting, and keep the label in view.",
      "If scanning still fails, use manual entry.",
      "Confirm all 17 characters; VINs do not use I, O, or Q.",
    ],
    done: "The VIN is confirmed and the inspection advances.",
    problem:
      "Hardware-scanner settings apply only on supported devices. If manual entry is rejected, check the length and characters.",
  }),
];

export function guideHref(input: {
  guide?: string;
  facility?: string;
  task?: string;
}) {
  const params = new URLSearchParams();
  if (input.guide) params.set("guide", input.guide);
  if (input.facility) params.set("facility", input.facility);
  if (input.task) params.set("task", input.task);
  const query = params.toString();
  return query ? `/resources/guides?${query}` : "/resources/guides";
}

export function buildFacilityGuide(
  facility: FacilitySummary,
  registration?: FacilityRegistrationConfiguration | null,
): ResourceGuideDefinition {
  const facilityName = formatFacilityDisplayName(
    registration?.onboardingDisplayName || facility.name,
  );
  const yardNames = (facility.yards ?? [])
    .filter((yard) => yard.active)
    .map((yard) => yard.name);
  const quickStart = getFacilityQuickStartAsset({
    slug: facility.slug,
    id: facility.id,
  });
  const supportParts = [
    registration?.support?.displayName,
    registration?.support?.email,
    registration?.support?.phone,
  ].filter(Boolean);

  return published({
    id: `facility-${facility.id}`,
    title: `${facilityName} Quick Start`,
    description: quickStart
      ? quickStart.purpose
      : yardNames.length
        ? `Facility-specific yard choices: ${yardNames.join(", ")}.`
        : "No special operating instruction is configured for this facility.",
    category: "manage-access",
    audience: "shared",
    access: "authenticated",
    keywords: [
      facility.name,
      facility.region || "",
      "facility",
      "yard",
      "access",
      "registration",
      "QR",
      "quick start",
      ...yardNames,
    ],
    where: `Portal → Resources → ${facilityName}`,
    steps: quickStart
      ? quickStart.steps
      : [
          ...(registration?.registrationUrl
            ? [
                `Use this facility’s registration link only when someone needs access to ${facilityName}.`,
              ]
            : [
                `Ask the approved facility administrator for access to ${facilityName}.`,
              ]),
          ...(yardNames.length
            ? [
                `When the workflow asks for a yard, choose the assigned option from: ${yardNames.join(", ")}.`,
              ]
            : []),
          "Use the universal task guide for the inspection or report procedure.",
        ],
    done: quickStart
      ? quickStart.done
      : `The account is assigned to ${facilityName}${yardNames.length ? " and the assigned configured yard can be selected" : ""}.`,
    problem: quickStart
      ? `${quickStart.support.displayName} · ${quickStart.support.email}. ${quickStart.support.instruction}`
      : supportParts.length
        ? `Use the configured support contact: ${supportParts.join(" · ")}.`
        : "Open Support Tickets and include the facility name, account email, and exact message shown.",
    registrationUrl:
      quickStart?.registrationUrl ?? registration?.registrationUrl,
    support: quickStart?.support ?? registration?.support,
    yards: quickStart
      ? quickStart.facility.yards.map((yard) => yard.name)
      : yardNames,
    facilityId: facility.id,
    facilityName,
    quickStart: quickStart || undefined,
  });
}

export function resourceSearchText(guide: ResourceGuideDefinition): string {
  const category = resourceCategories.find(
    (item) => item.id === guide.category,
  );
  return [
    guide.title,
    guide.description,
    category?.title,
    category?.description,
    guide.audience,
    guide.access,
    guide.facilityName,
    guide.registrationUrl,
    guide.where,
    guide.done,
    guide.problem,
    guide.referenceNote,
    guide.quickStart?.title,
    guide.quickStart?.purpose,
    guide.quickStart?.registrationUrl,
    guide.quickStart?.support.instruction,
    ...guide.keywords,
    ...guide.steps,
    ...(guide.yards ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function rankResourceGuides(
  guides: ResourceGuideDefinition[],
  query: string,
): ResourceGuideDefinition[] {
  const tokens = splitSearchTokens(query).map((token) => token.toLowerCase());
  if (!tokens.length) return guides.slice();

  const normalizedQuery = normalizeSearchText(query);
  return guides
    .map((guide, index) => {
      const category = resourceCategories.find(
        (item) => item.id === guide.category,
      );
      const title = normalizeSearchText(guide.title);
      const categoryText = normalizeSearchText(
        `${category?.title ?? ""} ${category?.description ?? ""}`,
      );
      const keywords = normalizeSearchText(guide.keywords.join(" "));
      const description = normalizeSearchText(guide.description);
      const facilityContext = normalizeSearchText(
        [guide.facilityName, ...(guide.yards ?? [])].filter(Boolean).join(" "),
      );
      const body = normalizeSearchText(
        [guide.where, ...guide.steps, guide.done, guide.problem].join(" "),
      );
      const allText = normalizeSearchText(resourceSearchText(guide));
      const matchedTokens = tokens.filter((token) => allText.includes(token));
      if (!matchedTokens.length) return null;

      let score = 0;
      if (normalizedQuery && title.includes(normalizedQuery)) score += 160;
      if (normalizedQuery && keywords.includes(normalizedQuery)) score += 90;
      if (normalizedQuery && facilityContext.includes(normalizedQuery))
        score += 90;
      if (normalizedQuery && categoryText.includes(normalizedQuery))
        score += 70;

      for (const token of matchedTokens) {
        if (title.includes(token)) score += 60;
        if (keywords.includes(token)) score += 45;
        if (facilityContext.includes(token)) score += 45;
        if (categoryText.includes(token)) score += 35;
        if (description.includes(token)) score += 20;
        if (body.includes(token)) score += 8;
      }

      if (matchedTokens.length === tokens.length) score += 25;
      return { guide, index, score };
    })
    .filter(
      (
        entry,
      ): entry is {
        guide: ResourceGuideDefinition;
        index: number;
        score: number;
      } => Boolean(entry),
    )
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.guide);
}

export function findGeneralGuide(id: string): ResourceGuideDefinition | null {
  return (
    generalResourceGuides.find(
      (guide) => guide.id === id && guide.publicationStatus === "published",
    ) ?? null
  );
}

export function canAccessResourceGuide(
  guide: ResourceGuideDefinition,
  access: ResourceAccessContext,
): boolean {
  if (guide.access === "authenticated") return true;
  if (access.isSuperAdmin) return true;
  if (guide.access === "facility-admin") return access.isFacilityAdmin;
  if (guide.access === "org-admin") return access.isOrgAdmin;
  return false;
}

export function visibleResourceGuides(
  access: ResourceAccessContext,
): ResourceGuideDefinition[] {
  return generalResourceGuides.filter(
    (guide) =>
      guide.publicationStatus === "published" &&
      canAccessResourceGuide(guide, access),
  );
}
