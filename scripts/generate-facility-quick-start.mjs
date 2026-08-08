import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake-node");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1].trim() : fallback;
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`Missing required --${name} value.`);
  return value;
}

function fileSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "facility";
}

const facilityName = requiredArgument("facility");
const organizationName = requiredArgument("organization");
const registrationUrl = requiredArgument("url");
const supportName = argument("support-name", "Inspection-Trac Support");
const supportEmail = argument("support-email", "support@inspection-trac.com");
const supportPhone = argument("support-phone");
const appStoreUrl = argument("ios-url", "https://apps.apple.com/us/app/inspection-trac/id6774376762");
const googlePlayUrl = argument("android-url", "https://play.google.com/store/apps/details?id=com.nulanesystems.inspectiontrac");
const packetRevision = Math.max(1, Number.parseInt(argument("revision", "1"), 10) || 1);
const outputPath = path.resolve(argument(
  "output",
  path.join(projectRoot, `output/pdf/${fileSlug(facilityName)}-inspection-trac-facility-access.pdf`)
));

const contentPath = path.join(projectRoot, "src/components/facilities/facilityStartupGuideContent.json");
const guideContent = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const shieldLogoPath = path.join(projectRoot, "public/media/inspection-trac-logo.png");
const appHomeScreenshotPath = path.join(projectRoot, "public/images/app-photo-2.png");
const damageReviewScreenshotPath = path.join(projectRoot, "public/images/app-photo-5.png");

const colors = {
  navy: "#06234f",
  navyDeep: "#031633",
  blue: "#1d4ed8",
  blueSoft: "#eaf1ff",
  gold: "#f6b400",
  goldSoft: "#fff7d6",
  ink: "#101b2d",
  slate: "#526176",
  line: "#d9e2ef",
  paper: "#f5f8fc",
  white: "#ffffff",
  green: "#087f5b",
  greenSoft: "#e8f7f1",
  orange: "#a74409",
  orangeSoft: "#fff1e7",
};

const fonts = {
  Roboto: {
    normal: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
  },
};

function card(body, { fill = colors.white, border = colors.line, padding = 14 } = {}) {
  return {
    table: { widths: ["*"], body: [[{ stack: body, fillColor: fill, margin: [padding, padding, padding, padding] }]] },
    layout: {
      hLineColor: () => border,
      vLineColor: () => border,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

function stepRow(step, index) {
  return {
    columns: [
      {
        width: 28,
        text: String(index + 1).padStart(2, "0"),
        alignment: "left",
        color: index === 4 ? colors.orange : colors.gold,
        bold: true,
        fontSize: 15,
        margin: [0, 0, 0, 0],
      },
      {
        width: "*",
        stack: [
          { text: step.title, bold: true, fontSize: 11, color: colors.ink, margin: [0, 0, 0, 2] },
          { text: step.detail, color: colors.slate, fontSize: 8.8, lineHeight: 1.18 },
        ],
        margin: [0, 1, 0, 0],
      },
    ],
    columnGap: 11,
    margin: [0, 0, 0, index === guideContent.steps.length - 1 ? 0 : 11],
  };
}

function screenshotPanel(imagePath, title, detail) {
  return card([
    {
      image: imagePath,
      fit: [192, 400],
      alignment: "center",
      margin: [0, 0, 0, 10],
    },
    { text: title, alignment: "center", bold: true, fontSize: 10.5, color: colors.navy, margin: [0, 0, 0, 4] },
    { text: detail, alignment: "center", fontSize: 8.5, color: colors.slate, lineHeight: 1.16 },
  ], { padding: 12 });
}

const supportLine = [supportName, supportEmail, supportPhone].filter(Boolean).join(" - ");
const frontChecklist = [
  ["1", "Scan", "Open the secure Chicago Heights registration page."],
  ["2", "Use your work email", "Existing users sign in. New users create an account and verify the email."],
  ["3", "Finish access", "Return to the registration page and confirm Chicago Heights before opening the app."],
];

const definition = {
  info: {
    title: `${facilityName} Inspection-Trac Facility Access`,
    author: "Nulane Systems",
    subject: `Facility registration and quick start for ${facilityName}`,
  },
  pageSize: "LETTER",
  pageMargins: [42, 34, 42, 40],
  background(currentPage) {
    if (currentPage === 1) {
      return [
        {
          canvas: [
          { type: "rect", x: 0, y: 0, w: 612, h: 792, color: colors.paper },
            { type: "rect", x: 0, y: 0, w: 612, h: 172, color: colors.navyDeep },
            { type: "rect", x: 0, y: 172, w: 612, h: 7, color: colors.gold },
          ],
        },
        {
          image: shieldLogoPath,
          width: 138,
          opacity: 1,
          absolutePosition: { x: 438, y: 17 },
        },
      ];
    }
    return [
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 612, h: 792, color: colors.paper },
          { type: "rect", x: 0, y: 0, w: 612, h: 96, color: colors.navyDeep },
          { type: "rect", x: 0, y: 96, w: 612, h: 6, color: colors.gold },
        ],
      },
      {
        image: shieldLogoPath,
        width: 76,
        opacity: 1,
        absolutePosition: { x: 500, y: 10 },
      },
    ];
  },
  content: [
    {
      width: "*",
      stack: [
        { text: "FACILITY QUICK START", color: colors.gold, bold: true, fontSize: 9, characterSpacing: 1.8, margin: [0, 6, 0, 8] },
        { text: facilityName, color: colors.white, bold: true, fontSize: 29, margin: [0, 0, 0, 3] },
        { text: organizationName, color: "#c9d7ed", fontSize: 11 },
      ],
      margin: [0, 0, 0, 75],
    },
    { text: "Scan. Sign in. Start inspecting.", bold: true, fontSize: 24, color: colors.ink, margin: [0, 0, 0, 5] },
    { text: guideContent.front.instruction, color: colors.slate, fontSize: 10.5, lineHeight: 1.22, margin: [0, 0, 0, 16] },
    {
      columns: [
        {
          width: 196,
          stack: [
            card([
              { text: "SCAN FOR CHICAGO HEIGHTS", alignment: "center", bold: true, fontSize: 8.5, color: colors.navy, characterSpacing: 0.8, margin: [0, 0, 0, 8] },
              {
                table: {
                  widths: [150],
                  body: [[{
                    qr: registrationUrl,
                    fit: 142,
                    eccLevel: "M",
                    foreground: colors.navyDeep,
                    background: colors.white,
                    alignment: "center",
                    margin: [4, 4, 4, 4],
                  }]],
                },
                alignment: "center",
                layout: {
                  hLineColor: () => colors.line,
                  vLineColor: () => colors.line,
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                },
              },
              { text: "Open the secure registration link", link: registrationUrl, alignment: "center", color: colors.blue, bold: true, fontSize: 7.3, margin: [0, 8, 0, 0] },
            ], { padding: 12 }),
          ],
        },
        {
          width: "*",
          stack: [
            { text: "WHAT HAPPENS NEXT", bold: true, fontSize: 9, color: colors.navy, characterSpacing: 1.1, margin: [0, 1, 0, 10] },
            ...frontChecklist.map(([number, title, detail], index) => ({
              columns: [
                { width: 28, text: `0${number}`, bold: true, color: index === 2 ? colors.orange : colors.gold, fontSize: 15 },
                { width: "*", stack: [{ text: title, bold: true, fontSize: 10.5, margin: [0, 0, 0, 2] }, { text: detail, color: colors.slate, fontSize: 8.7, lineHeight: 1.16 }] },
              ],
              columnGap: 10,
              margin: [0, 0, 0, index === 2 ? 0 : 13],
            })),
          ],
          margin: [0, 4, 0, 0],
        },
      ],
      columnGap: 24,
      margin: [0, 0, 0, 15],
    },
    {
      columns: [
        {
          width: "*",
          ...card([
            { text: "ALREADY HAVE AN ACCOUNT?", bold: true, color: colors.green, fontSize: 8.5, characterSpacing: 0.6, margin: [0, 0, 0, 4] },
            { text: "Enter that same email and choose Sign in. After the verified login returns, Chicago Heights is added to your access.", color: colors.ink, fontSize: 8.7, lineHeight: 1.16 },
          ], { fill: colors.greenSoft, border: "#b8e3d4", padding: 11 }),
        },
        {
          width: "*",
          ...card([
            { text: "NEW TO INSPECTION-TRAC?", bold: true, color: colors.orange, fontSize: 8.5, characterSpacing: 0.6, margin: [0, 0, 0, 4] },
            { text: "Choose Create account, verify the email Auth0 sends, then return here and finish the Chicago Heights assignment.", color: colors.ink, fontSize: 8.7, lineHeight: 1.16 },
          ], { fill: colors.orangeSoft, border: "#f3cfb5", padding: 11 }),
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 11],
    },
    card([
      { text: guideContent.front.privacy, color: colors.navy, bold: true, fontSize: 8.6, lineHeight: 1.15 },
    ], { fill: colors.goldSoft, border: "#f1d46b", padding: 10 }),

    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "YOUR FIRST 5 MINUTES", color: colors.gold, bold: true, fontSize: 9, characterSpacing: 1.8, margin: [0, 5, 0, 7] },
            { text: guideContent.back.title, color: colors.white, bold: true, fontSize: 23 },
          ],
        },
      ],
      columnGap: 18,
      pageBreak: "before",
      margin: [0, 0, 0, 24],
    },
    {
      columns: [
        { width: "*", stack: guideContent.steps.slice(0, 3).map(stepRow) },
        { width: "*", stack: guideContent.steps.slice(3).map((step, offset) => stepRow(step, offset + 3)) },
      ],
      columnGap: 24,
      margin: [0, 0, 0, 16],
    },
    {
      columns: [
        {
          width: "*",
          ...card([
            { text: "BEFORE YOU OPEN THE APP", bold: true, fontSize: 10, color: colors.navy, margin: [0, 0, 0, 8] },
            { text: "[ ] The page says Chicago Heights", fontSize: 8.8, color: colors.ink, margin: [0, 0, 0, 5] },
            { text: "[ ] You used the same email to register and sign in", fontSize: 8.8, color: colors.ink, margin: [0, 0, 0, 5] },
            { text: "[ ] New account email verification is complete", fontSize: 8.8, color: colors.ink },
          ], { fill: colors.blueSoft, border: "#bdcff8", padding: 13 }),
        },
        {
          width: "*",
          ...card([
            { text: "INSTALL INSPECTION-TRAC", bold: true, fontSize: 10, color: colors.navy, margin: [0, 0, 0, 8] },
            { text: [{ text: "iPhone: ", bold: true }, { text: "Open the App Store", link: appStoreUrl, color: colors.blue }], fontSize: 8.8, margin: [0, 0, 0, 6] },
            { text: [{ text: "Android: ", bold: true }, { text: "Open Google Play", link: googlePlayUrl, color: colors.blue }], fontSize: 8.8, margin: [0, 0, 0, 8] },
            { text: "Sign in with the same verified account used during registration.", color: colors.slate, fontSize: 8.5, lineHeight: 1.15 },
          ], { fill: colors.white, border: colors.line, padding: 13 }),
        },
      ],
      columnGap: 14,
      margin: [0, 0, 0, 14],
    },
    card([
      { text: "STOP IF THE FACILITY IS WRONG", bold: true, color: colors.orange, fontSize: 9.5, margin: [0, 0, 0, 4] },
      { text: guideContent.back.safety, color: colors.ink, fontSize: 8.8, lineHeight: 1.16 },
    ], { fill: colors.orangeSoft, border: "#efc19e", padding: 11 }),
    {
      stack: [
        { text: "NEED HELP?", bold: true, color: colors.navy, fontSize: 9, characterSpacing: 0.7, margin: [0, 2, 0, 3] },
        { text: supportLine, color: colors.ink, fontSize: 9 },
        { text: "Include the support reference shown on the registration page.", color: colors.slate, fontSize: 8.2, margin: [0, 3, 0, 0] },
      ],
      margin: [0, 15, 0, 0],
    },
    {
      stack: [
        { text: "WHAT YOU WILL SEE", color: colors.gold, bold: true, fontSize: 9, characterSpacing: 1.8, margin: [0, 5, 0, 7] },
        { text: "Recognize the Inspection-Trac app", color: colors.white, bold: true, fontSize: 23 },
      ],
      pageBreak: "before",
      margin: [0, 0, 0, 22],
    },
    {
      text: "These example screens show the Inspection-Trac logo and the two places most new inspectors use first. Your available inspection buttons can vary by facility access.",
      color: colors.slate,
      fontSize: 10,
      lineHeight: 1.2,
      margin: [0, 0, 0, 16],
    },
    {
      columns: [
        {
          width: "*",
          ...screenshotPanel(
            appHomeScreenshotPath,
            "1. Start from the home screen",
            "Confirm the Inspection-Trac logo, then choose the inspection type assigned to your facility."
          ),
        },
        {
          width: "*",
          ...screenshotPanel(
            damageReviewScreenshotPath,
            "2. Review captured damage",
            "Before sending, confirm the damage area, type, severity, photos, and highlighted vehicle zone."
          ),
        },
      ],
      columnGap: 16,
      margin: [0, 0, 0, 14],
    },
    card([
      { text: "LOOK FOR THE FULL-COLOR SHIELD", bold: true, color: colors.navy, fontSize: 9.5, margin: [0, 0, 0, 4] },
      { text: "The fully opaque Inspection-Trac shield shown at the top of this page is the brand mark used in the app and portal.", color: colors.ink, fontSize: 8.8, lineHeight: 1.16 },
    ], { fill: colors.goldSoft, border: "#f1d46b", padding: 11 }),
  ],
  footer(currentPage, pageCount) {
    return {
      columns: [
        { width: "*", text: `Inspection-Trac - ${facilityName}`, alignment: "left" },
        { width: "auto", text: `Revision ${packetRevision} - Page ${currentPage} of ${pageCount}`, alignment: "right" },
      ],
      color: "#6b7b91",
      fontSize: 7.5,
      margin: [42, 10, 42, 0],
    };
  },
  defaultStyle: { font: "Roboto", color: colors.ink },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const printer = new PdfPrinter(fonts);
const pdf = printer.createPdfKitDocument(definition);
const output = fs.createWriteStream(outputPath);
pdf.pipe(output);
pdf.end();

await new Promise((resolve, reject) => {
  output.on("finish", resolve);
  output.on("error", reject);
  pdf.on("error", reject);
});

console.log(JSON.stringify({ outputPath, facilityName, registrationUrl, packetRevision, pages: 3 }));
