export const CIRCLE_PROJECT_CODE = "CIR";

export const CIRCLE_COMPONENTS = [
  {
    code: "mobile",
    name: "Circle Mobile",
    componentType: "mobile",
    localPath: "/Users/home/Desktop/Codex/apps/docudent-circle",
    remoteUrl: "ssh://git@nulane-local-gitlab/nulane/docudent-circle.git",
    authoritativeBranch: "main-apple",
    gitlabProjectPath: "nulane/docudent-circle",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/docudent-circle",
    runnerName: "circle-mobile",
    productionUrl: null,
    displayOrder: 1
  },
  {
    code: "api",
    name: "Circle API / load engine",
    componentType: "api",
    localPath: "/Users/home/Desktop/Codex/worktrees/docudent-circle-load-engine",
    remoteUrl: "ssh://git@nulane-local-gitlab/nulane/circle-api.git",
    authoritativeBranch: "main",
    gitlabProjectPath: "nulane/circle-api",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/circle-api",
    runnerName: "circle-api",
    productionUrl: "https://api.nulanesystems.com/circle/api/health",
    displayOrder: 2
  },
  {
    code: "portal",
    name: "Circle Portal / dispatch",
    componentType: "portal",
    localPath: "/Users/home/Desktop/Codex/worktrees/vercel-portal-circle-dispatch",
    remoteUrl: "ssh://git@nulane-local-gitlab/nulane/circle-portal.git",
    authoritativeBranch: "main",
    gitlabProjectPath: "nulane/circle-portal",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/circle-portal",
    runnerName: "circle-portal",
    productionUrl: "https://portal.nulanesystems.com",
    displayOrder: 3
  }
] as const;

export const CIRCLE_QA_ITEMS = [
  ["my-loads", "My Loads", "mobile"],
  ["assigned-load-vin", "Assigned-load VIN handling", "mobile"],
  ["direct-delivery-submission", "Direct Delivery Submission", "mobile"],
  ["damage-submission", "Damage Submission", "mobile"],
  ["no-damage-pod", "No-damage POD", "mobile"],
  ["damage-pod", "Damage POD", "mobile"],
  ["separate-damage-report", "Separate damage report", "mobile"],
  ["portal-load-builder", "Portal load builder", "portal"],
  ["driver-assignment", "Driver assignment", "portal"],
  ["users-and-roles", "Users and roles", "portal"],
  ["map-location-selection", "Map/location selection", "portal"],
  ["retry-and-recovery", "Retry and recovery", "api"],
  ["deployment-and-rollback", "Deployment and rollback", "api"]
] as const;

export const QA_STATUSES = [
  "not_started",
  "testing",
  "passed",
  "failed",
  "needs_review",
  "blocked",
  "retest_required"
] as const;

export type CircleQaStatus = (typeof QA_STATUSES)[number];

export const CIRCLE_TODAY_ITEMS = [
  {
    sequence: 1,
    title: "Confirm Circle test tenant, dispatcher, driver, VIN, and assigned load",
    estimatedMinutes: 30,
    dependency: "Requires valid Circle test identities and data"
  },
  {
    sequence: 2,
    title: "Run portal → API → mobile → persisted delivery happy path",
    estimatedMinutes: 75,
    dependency: "Requires item 1 and a physical test device"
  },
  {
    sequence: 3,
    title: "Exercise offline, retry, duplicate, auth-expiry, and damage branches",
    estimatedMinutes: 75,
    dependency: "Requires one successful baseline delivery"
  },
  {
    sequence: 4,
    title: "Review portal status/artifacts and capture release evidence",
    estimatedMinutes: 45,
    dependency: "Requires backend correlation IDs from items 2–3"
  },
  {
    sequence: 5,
    title: "Close CI/deployment gaps and approve or reject the release candidate",
    estimatedMinutes: 60,
    dependency: "Requires QA evidence and authenticated GitLab pipeline history"
  }
] as const;
