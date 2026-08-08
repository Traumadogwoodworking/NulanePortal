import type { FacilityRegistrationConfiguration } from "@/lib/services/facilityOnboardingService";
import type { FacilitySummary } from "@/lib/types";
import { formatFacilityDisplayName } from "@/lib/facilityDisplay";

export type ResourceAudience = "field" | "portal" | "shared";
export type ResourcePublicationStatus = "published" | "draft";

export interface ResourceSection {
  title: string;
  steps: string[];
}

export interface ResourceGuideDefinition {
  id: string;
  title: string;
  description: string;
  audience: ResourceAudience;
  keywords: string[];
  publicationStatus: ResourcePublicationStatus;
  sections: ResourceSection[];
  facilityId?: string;
  facilityName?: string;
  registrationUrl?: string;
  support?: { displayName?: string; email?: string; phone?: string };
  yards?: string[];
}

const published = (input: Omit<ResourceGuideDefinition, "publicationStatus">): ResourceGuideDefinition => ({
  ...input,
  publicationStatus: "published",
});

export const generalResourceGuides: ResourceGuideDefinition[] = [
  published({
    id: "sign-in-and-select-facility",
    title: "Sign In and Select the Current Facility",
    description: "Use the mobile app sign-in flow and choose the facility where you are working.",
    audience: "field",
    keywords: ["login", "sign in", "user", "account", "facility", "location"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Open Inspection-Trac and use the sign-in action.",
          "Complete the sign-in flow with your account.",
          "When the app asks for the current facility, choose the facility where you are working.",
          "Save the facility selection and continue to the dashboard.",
        ],
      },
      {
        title: "If the facility is missing",
        steps: [
          "Stop if the facility you need is not in the list.",
          "Facility selection is required to continue; ask an administrator to assign the correct facility access.",
        ],
      },
    ],
  }),
  published({
    id: "scan-or-enter-vin",
    title: "Scan or Enter a VIN",
    description: "Capture the vehicle VIN and confirm it before moving into the inspection.",
    audience: "field",
    keywords: ["scanner", "scan", "qr", "vin", "vehicle", "manual", "enter"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Open the VIN capture step for the inspection.",
          "Scan the VIN when the scanner is available, or enter the VIN manually when scanning does not produce a usable value.",
          "Confirm the captured VIN before continuing.",
          "Use a valid 17-character VIN. The app rejects VINs containing I, O, or Q.",
        ],
      },
      {
        title: "If the scan fails",
        steps: [
          "Keep the vehicle and VIN in view and try the capture again.",
          "If scanning still does not work, use the manual VIN entry in the same workflow.",
        ],
      },
    ],
  }),
  published({
    id: "complete-damage-inspection",
    title: "Complete a Damage Inspection",
    description: "Record the vehicle, damage details, required photos, signature, and submission.",
    audience: "field",
    keywords: ["inspection", "damage", "photos", "photo", "signature", "submit", "vin"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Capture or enter a valid 17-character VIN.",
          "Add a damage entry and select the damaged area and damage type.",
          "Capture at least one readable photograph for each damage entry.",
          "Capture the required inspector signature when the workflow asks for it.",
          "Review the report, then submit it after the required checks pass.",
        ],
      },
      {
        title: "Before submitting",
        steps: [
          "Confirm the VIN is valid.",
          "Confirm every damage entry has an area, damage type, and readable photo.",
          "Recapture any file the app says is missing or cannot be read.",
        ],
      },
    ],
  }),
  published({
    id: "complete-no-damage-inspection",
    title: "Complete a No-Damage Inspection",
    description: "Complete the inspection when no damage is observed and submit the reviewed report.",
    audience: "field",
    keywords: ["inspection", "no damage", "clear", "photos", "signature", "submit", "vin"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Capture or enter a valid 17-character VIN.",
          "Mark the vehicle as no damage observed when the damage step is shown.",
          "Complete the remaining fields shown by the enabled inspection workflow.",
          "Capture a required inspector signature when the workflow asks for it.",
          "Review the report and submit it.",
        ],
      },
      {
        title: "If the app will not submit",
        steps: [
          "Read the validation message and complete the field it identifies.",
          "Do not leave the damage step blank: explicitly mark no damage observed when there is no damage entry.",
        ],
      },
    ],
  }),
  published({
    id: "resume-saved-work",
    title: "Resume Saved Work",
    description: "Find an interrupted or pending inspection in the mobile app and continue from its saved state.",
    audience: "field",
    keywords: ["resume", "saved", "incomplete", "pending", "failed submission", "offline", "report"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Sign in again if the app asks for authentication.",
          "Open the dashboard and find the saved report by VIN or report ID.",
          "Open an in-progress report to resume the workflow.",
          "Review any pending, failed, or sign-in status shown on the report card and follow the displayed next action.",
        ],
      },
      {
        title: "After signing back in",
        steps: [
          "The app checks for queued reports after login and attempts to continue their delivery.",
          "Keep the report open until its status confirms whether it completed or still needs attention.",
        ],
      },
    ],
  }),
  published({
    id: "find-submitted-report",
    title: "Find a Submitted Report",
    description: "Open the portal report list, locate a submitted inspection, and review its status and evidence.",
    audience: "portal",
    keywords: ["report", "submitted", "status", "photos", "pdf", "facility", "vin"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Open Damage Reports in the portal.",
          "Use the available facility, VIN, status, or date filters to narrow the list.",
          "Select the report you need to review.",
          "Review the report status, facility, vehicle details, photos, and PDF when those items are available.",
        ],
      },
    ],
  }),
  published({
    id: "export-facility-reports",
    title: "Export Facility Reports",
    description: "Download selected report PDFs or a CSV from the portal report list.",
    audience: "portal",
    keywords: ["export", "download", "csv", "pdf", "report", "facility"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Open Damage Reports in the portal.",
          "Filter the list to the facility and date or status you need.",
          "Select the reports to export. The report selection supports up to 25 reports at once.",
          "Choose Download PDFs or Download CSV.",
        ],
      },
    ],
  }),
  published({
    id: "get-support",
    title: "Get Help with Access or a Report",
    description: "Send a support request with the facility, account, report, and evidence details that matter.",
    audience: "shared",
    keywords: ["support", "help", "failed submission", "access", "account", "report"],
    sections: [
      {
        title: "Steps",
        steps: [
          "Open Support Tickets in the portal.",
          "Include the facility name and the account or report involved.",
          "Describe the problem and what the app or portal displayed.",
          "Attach a screenshot or short recording when it helps explain the problem.",
        ],
      },
    ],
  }),
];

export function guideHref(input: { guide?: string; facility?: string; task?: string }) {
  const params = new URLSearchParams();
  if (input.guide) params.set("guide", input.guide);
  if (input.facility) params.set("facility", input.facility);
  if (input.task) params.set("task", input.task);
  return `/resources/guides?${params.toString()}`;
}

export function buildFacilityGuide(
  facility: FacilitySummary,
  registration?: FacilityRegistrationConfiguration | null,
): ResourceGuideDefinition {
  const facilityName = formatFacilityDisplayName(registration?.onboardingDisplayName || facility.name);
  const yardNames = (facility.yards ?? []).filter((yard) => yard.active).map((yard) => yard.name);

  return published({
    id: `facility-${facility.id}`,
    title: `Get Started at ${facilityName}`,
    description: `Use the configured access, facility selection, and location information for ${facilityName}.`,
    audience: "shared",
    keywords: [
      facility.name,
      facility.region || "",
      "facility",
      "yard",
      "area",
      "bay",
      "account",
      "access",
      ...yardNames,
    ],
    facilityId: facility.id,
    facilityName,
    registrationUrl: registration?.registrationUrl,
    support: registration?.support,
    yards: yardNames,
    sections: [
      {
        title: "Getting started",
        steps: [
          ...(registration?.registrationUrl
            ? [
                "Open the facility registration link, create or sign in to your account, and confirm the page names this facility.",
                "Open Inspection-Trac and sign in with the same account.",
              ]
            : ["Ask your administrator for the configured account access link before starting."]),
          "When the app asks for the current facility, select this facility before continuing.",
        ],
      },
      {
        title: "Location entry",
        steps: yardNames.length
          ? [
              `Use one of the configured yards for this facility: ${yardNames.join(", ")}.`,
              "Enter the bay or area shown by the facility workflow. If the correct location is not available, stop and ask the facility administrator rather than selecting a substitute.",
            ]
          : [
              "Select this facility before starting the inspection.",
              "Enter the bay or area shown by the facility workflow. No active yard options are currently configured for this facility.",
            ],
      },
      {
        title: "Inspection workflows",
        steps: [
          "Use the shared task guides on Resources & Training for VIN capture, damage or no-damage inspection, saved work, and submission.",
          "If the workflow shown in the app differs from a shared guide, stop and contact support so the facility instructions can be confirmed.",
        ],
      },
      {
        title: "Reports",
        steps: [
          "Authorized portal users can open Damage Reports to find submitted reports for the facility.",
          "Use the report list to review status, photos, and available PDFs, or export selected reports.",
        ],
      },
      {
        title: "If something goes wrong",
        steps: [
          "Wrong facility: open Settings in the app, change the current facility, and save it before continuing.",
          "Interrupted inspection: use Resume Saved Work from the shared guides.",
          "Missing access or a failed submission: record the facility and report details, then open Support Tickets.",
        ],
      },
      {
        title: "Help",
        steps: [
          ...(registration?.support?.email || registration?.support?.phone
            ? [
                `Configured facility support: ${[registration.support.displayName, registration.support.email, registration.support.phone].filter(Boolean).join(" · ")}.`,
              ]
            : ["No facility-specific support contact is configured in the current registration record."]),
          "Use Support Tickets for access, workflow, or report problems that need follow-up.",
        ],
      },
    ],
  });
}

export function findGeneralGuide(id: string | null | undefined) {
  return generalResourceGuides.find((guide) => guide.id === id && guide.publicationStatus === "published") ?? null;
}

export function resourceSearchText(guide: ResourceGuideDefinition) {
  return [
    guide.title,
    guide.description,
    guide.facilityName,
    ...(guide.keywords ?? []),
    ...guide.sections.flatMap((section) => [section.title, ...section.steps]),
  ]
    .filter(Boolean)
    .join(" ");
}
