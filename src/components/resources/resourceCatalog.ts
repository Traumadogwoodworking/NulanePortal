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
  published({
    id: "mobile-app-screen-map",
    title: "Inspection-Trac App Screen Map",
    description: "A screen-by-screen map of the mobile app, including what to expect before, during, and after an inspection.",
    audience: "field",
    keywords: ["app", "mobile", "screen", "dashboard", "vin", "inspection", "review", "settings", "offline", "scanner"],
    sections: [
      {
        title: "Sign-in and session",
        steps: [
          "Open Inspection-Trac. A signed-out user starts at the branded sign-in screen; a signed-in user is taken to the Dashboard.",
          "Use the same verified account that was used for facility registration. If authentication expires, sign in again before resuming work.",
          "If the app sends you back to sign-in, do not create a second account. Sign in with the existing verified account and allow the app to reload access.",
        ],
      },
      {
        title: "Dashboard",
        steps: [
          "The Dashboard is the app home screen. It shows the inspection modules enabled for the current organization and facility.",
          "Damage Submission starts the standard vehicle damage flow. Interchange, 24 Hour Inspection, Rail Ship Approved, and other modules appear only when their configuration makes them available.",
          "The Reports area groups submitted, queued, and partial work. Open a report card to review it or resume an incomplete workflow.",
          "Use Settings for the current facility, account, support, legal pages, tutorial replay, and scanner-mode preferences.",
        ],
      },
      {
        title: "VIN capture",
        steps: [
          "The VIN Scanner is the first screen for the standard damage flow and other scanner-led workflows.",
          "Use the camera or configured hardware scanner when available. If scanning cannot produce a usable value, choose manual entry in the same screen.",
          "Confirm the VIN before continuing. The app expects a valid 17-character VIN and rejects I, O, and Q characters.",
          "If the app asks for a facility, choose the facility where the vehicle is physically being inspected; do not select a substitute location.",
        ],
      },
      {
        title: "Inspection screen",
        steps: [
          "The guided tutorial may walk through Choose the damaged area, Select the damage type, Set the severity level, Capture supporting photos, and Review everything.",
          "For damage, complete the area, damage type, severity, and photo requirements before saving the entry. Add another damage entry when the vehicle has more than one issue.",
          "For no damage, explicitly choose the no-damage path when the app asks. Do not leave the damage decision blank.",
          "Save an entry for later when the inspection is not complete. The app keeps the report in a resumable state instead of forcing a partial submission.",
        ],
      },
      {
        title: "Review and submission",
        steps: [
          "Use Review Report after the required entries are saved. Review the VIN, facility, location, damage rows, photos, notes, and signature requirements shown by the workflow.",
          "If validation identifies a missing field or file, return to the identified step and correct it before submitting.",
          "Submit sends the report through the delivery queue. Keep the app open long enough to see whether it completed, queued, needs authentication, or needs user action.",
          "If a report is queued or interrupted, return to the Dashboard and resume it from the report status instead of starting a duplicate report.",
        ],
      },
      {
        title: "Settings and recovery",
        steps: [
          "In Settings, Current Facility is the source of truth for where new inspections are assigned. Change it only after saving or safely leaving active work.",
          "Replay Inspection Tutorial resets the guided tips for the next inspection; it does not delete reports or change facility access.",
          "VIN scanner mode controls the available scanner input on supported devices. iOS and web use the supported camera/input path instead of the hardware-scanner setting.",
          "Use Contact Support for access, workflow, or delivery problems and include the facility, VIN/report ID, and the message shown by the app.",
        ],
      },
    ],
  }),
  published({
    id: "mobile-app-workflow-inventory",
    title: "Mobile App Workflow Inventory",
    description: "The launchable app workflows and the screens they open, with configuration limits called out clearly.",
    audience: "field",
    keywords: ["interchange", "24 hour", "rsa", "rail", "module", "workflow", "inspection code", "feature flag"],
    sections: [
      {
        title: "Launchable dashboard workflows",
        steps: [
          "Damage Submission opens the standard VIN-led vehicle damage report at /vin-scan.",
          "Interchange opens the interchange inspection at /pad-vin-scan. Its availability is controlled by organization and feature configuration.",
          "24 Hour Inspection opens the 24-hour VIN flow at /twenty-four-hour-vin-scan and continues to its confirmation screen.",
          "Rail Ship Approved opens the railcar/deck scan flow at /rsa-car-scan when the RSA module is enabled for the user and facility.",
        ],
      },
      {
        title: "Shared report screens",
        steps: [
          "Inspection is the guided data-entry screen at /inspection. It supports damage/no-damage decisions, entries, photos, notes, and review navigation.",
          "Report Review is the final review and submission screen at /report-review. It also handles queued or saved report recovery.",
          "The Dashboard at /dashboard is the report lookup and recovery surface for submitted, queued, and partial local work.",
        ],
      },
      {
        title: "Conditional and backend-driven modules",
        steps: [
          "Generic and module routes are configuration-driven. Their form fields, workflow steps, and visibility come from the enabled module manifest rather than a single fixed screen.",
          "Official inspection codes without a dedicated launch route should be treated as unavailable until the backend manifest and facility access make them visible.",
          "Do not promise a module from a guide when it is not present on the current Dashboard; feature flags, organization settings, facility scope, and permissions can change what appears.",
        ],
      },
      {
        title: "Screens that are not normal field entry points",
        steps: [
          "App Control is an admin/runtime diagnostics surface, not a normal inspection step.",
          "POD Proof and export-related surfaces are app-side or backend-dependent and should not be presented as a guaranteed field workflow.",
          "Authentication callback routes are internal sign-in handling and are not user destinations.",
        ],
      },
    ],
  }),
  published({
    id: "portal-page-map",
    title: "Inspection-Trac Portal Page Map",
    description: "A complete map of the portal pages, what each page is for, and which access level controls it.",
    audience: "portal",
    keywords: ["portal", "home", "reports", "organizations", "facilities", "users", "branding", "email", "support", "resources", "settings", "page map"],
    sections: [
      {
        title: "Core pages",
        steps: [
          "Home (/home) is the operational overview. Use it for the filtered inspection totals, severity and damage-area charts, and current-view analytics.",
          "Damage Reports (/reports/damage) is the main report list. Filter and open reports, inspect evidence, and use the available PDF/CSV export actions.",
          "RSA Reports (/reports/rsa) is the Rail Safe Audit report surface and is shown only to the access scope that supports RSA.",
          "24 Hour (/inspection/24-hour) is the portal view for 24-hour inventory inspection reporting when the reports module is enabled.",
          "Dashboard (/dashboard) is a hidden/admin dashboard route retained for compatibility; normal navigation uses Home.",
        ],
      },
      {
        title: "Apps and facility operations",
        steps: [
          "Inspection-Trac (/docudent) is the linked app/product surface for the mobile inspection workflow.",
          "Organizations (/organizations) manages tenant and subscription data and requires organization-admin access.",
          "Facilities (/facilities) manages operational locations, yards, areas, facility access, and enrollment configuration and requires facility-admin access.",
          "Users (/users) manages users and roles for the organization/facilities and requires facility-admin access.",
        ],
      },
      {
        title: "Administration and support",
        steps: [
          "Branding (/branding) customizes portal appearance and is restricted to the super-admin scope.",
          "Email (/email) manages notifications and requires facility-admin access.",
          "Support Tickets (/support) is where access, workflow, and report problems are submitted for follow-up.",
          "Resources & Training (/resources) is the starting point for facility guides, app screen explanations, portal page inventory, app links, and access PDFs.",
          "Settings (/settings) is the workspace/session settings surface.",
        ],
      },
      {
        title: "How to use the portal day to day",
        steps: [
          "Start at Home to understand the current filtered view, then move to Damage Reports when a specific report needs review.",
          "Use Facilities and Users for access/configuration work; do not use reports as a substitute for changing facility membership or yard setup.",
          "Return to Resources & Training for the facility-specific guide before starting a new facility workflow or handing an app user their setup instructions.",
          "If a page is missing from the navigation, check the account role, required permission, module flag, and facility/organization scope before treating it as a broken link.",
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
        title: "Already inside the facility",
        steps: [
          "Do not reopen registration just because you are already on site. Open Settings in the app and confirm Current Facility matches this facility.",
          "Return to the Dashboard and choose the workflow enabled for this facility. The visible module cards are the source of truth for what you can start.",
          "Before capturing the VIN, confirm the yard and bay/area shown by the facility process. Stop and ask the facility administrator if the correct location is not available.",
        ],
      },
      {
        title: "What to expect in the app",
        steps: [
          "The app opens with a Dashboard, then moves through VIN capture, inspection entry, review, and submission for a standard damage report.",
          "During inspection, expect prompts for the damage decision, area, type, severity, supporting photos, notes, and signature when required by the enabled workflow.",
          "After submit, expect a completed, queued, authentication-paused, or user-action-needed status. Use the Dashboard to continue a queued or partial report.",
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
