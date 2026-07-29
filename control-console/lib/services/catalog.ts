export const PRODUCT_CATALOG = [
  {
    code: "INS",
    name: "Inspection Trac",
    description: "Inspection Trac mobile, production API, and portal",
    repositoryPath: "/Users/home/Desktop/Codex/NulaneRepo"
  },
  {
    code: "DOC",
    name: "DocuDent",
    description: "DocuDent mobile and production API",
    repositoryPath: "/Users/home/Desktop/Codex/apps/docudent-main-apple"
  }
] as const;

export const PRODUCT_COMPONENT_CATALOG = [
  {
    projectCode: "INS",
    code: "mobile",
    name: "Inspection Trac Mobile",
    componentType: "mobile",
    localPath: "/Users/home/Desktop/Codex/NulaneRepo",
    remoteUrl: "ssh://git@localhost:2424/nulane/inspection-trac-mobile.git",
    authoritativeBranch: "snapshot/inspection-trac-app-20260711",
    gitlabProjectPath: "nulane/inspection-trac-mobile",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/inspection-trac-mobile",
    runnerName: null,
    productionUrl: null,
    displayOrder: 1
  },
  {
    projectCode: "INS",
    code: "api",
    name: "Inspection Trac API",
    componentType: "api",
    localPath: "/Users/home/Desktop/Codex/apis/inspection-trac-api-cicd",
    remoteUrl: "ssh://git@localhost:2424/nulane/inspection-trac-api.git",
    authoritativeBranch: "production/inspection-trac",
    gitlabProjectPath: "nulane/inspection-trac-api",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/inspection-trac-api",
    runnerName: null,
    productionUrl: "https://api.nulanesystems.com/inspection-trac/api/status",
    displayOrder: 2
  },
  {
    projectCode: "INS",
    code: "portal",
    name: "Inspection Trac Portal",
    componentType: "portal",
    localPath: null,
    remoteUrl: null,
    authoritativeBranch: null,
    gitlabProjectPath: null,
    gitlabWebUrl: null,
    runnerName: null,
    productionUrl: "https://inspection-trac.com/home/",
    displayOrder: 3
  },
  {
    projectCode: "DOC",
    code: "mobile",
    name: "DocuDent Mobile",
    componentType: "mobile",
    localPath: "/Users/home/Desktop/Codex/apps/docudent-main-apple",
    remoteUrl: "https://github.com/Traumadogwoodworking/NulaneRepo.git",
    authoritativeBranch: "main-apple",
    gitlabProjectPath: null,
    gitlabWebUrl: null,
    runnerName: null,
    productionUrl: null,
    displayOrder: 1
  },
  {
    projectCode: "DOC",
    code: "api",
    name: "DocuDent API",
    componentType: "api",
    localPath: "/Users/home/Desktop/Codex/apis/inspection-trac-api-cicd",
    remoteUrl: "ssh://git@localhost:2424/nulane/docudent-api.git",
    authoritativeBranch: "production/docudent",
    gitlabProjectPath: "nulane/docudent-api",
    gitlabWebUrl: "http://127.0.0.1:8929/nulane/docudent-api",
    runnerName: null,
    productionUrl: "https://api.nulanesystems.com/health",
    displayOrder: 2
  }
] as const;

export const SERVICE_MONITOR_CATALOG = [
  {
    slug: "circle-api",
    projectCode: "CIR",
    componentCode: "api",
    name: "Circle API",
    serviceKind: "api",
    endpointUrl: "https://api.nulanesystems.com/circle/api/health",
    displayOrder: 10
  },
  {
    slug: "circle-portal",
    projectCode: "CIR",
    componentCode: "portal",
    name: "Circle Portal",
    serviceKind: "portal",
    endpointUrl: "https://portal.nulanesystems.com",
    displayOrder: 20
  },
  {
    slug: "inspection-trac-api",
    projectCode: "INS",
    componentCode: "api",
    name: "Inspection Trac API",
    serviceKind: "api",
    endpointUrl: "https://api.nulanesystems.com/inspection-trac/api/status",
    displayOrder: 30
  },
  {
    slug: "inspection-trac-portal",
    projectCode: "INS",
    componentCode: "portal",
    name: "Inspection Trac Portal",
    serviceKind: "portal",
    endpointUrl: "https://inspection-trac.com/home/",
    displayOrder: 40
  },
  {
    slug: "docudent-api",
    projectCode: "DOC",
    componentCode: "api",
    name: "DocuDent API",
    serviceKind: "api",
    endpointUrl: "https://api.nulanesystems.com/health",
    displayOrder: 50
  }
] as const;
