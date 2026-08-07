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

const fonts = {
  Roboto: {
    normal: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
  },
};

const steps = guideContent.steps.map((step, index) => ({
  columns: [
    { width: 28, text: `${index + 1}.`, alignment: "center", bold: true, color: "#1d4ed8", margin: [0, 6, 0, 6] },
    {
      width: "*",
      stack: [
        { text: step.title, bold: true, fontSize: 12, margin: [0, 0, 0, 2] },
        { text: step.detail, color: "#475569", fontSize: 10, lineHeight: 1.2 },
      ],
      margin: [0, 1, 0, 0],
    },
  ],
  columnGap: 12,
  margin: [0, 0, 0, 13],
}));
const supportLine = [supportName, supportEmail, supportPhone].filter(Boolean).join(" · ");

const definition = {
  info: {
    title: `${facilityName} Inspection-Trac Facility Access`,
    author: "Nulane Systems",
    subject: `Facility registration and quick start for ${facilityName}`,
  },
  pageSize: "LETTER",
  pageMargins: [54, 48, 54, 44],
  content: [
    { text: guideContent.front.eyebrow, color: "#64748b", bold: true, fontSize: 10, characterSpacing: 2.2 },
    { text: facilityName, bold: true, fontSize: 30, color: "#0f172a", margin: [0, 15, 0, 3] },
    { text: organizationName, color: "#475569", fontSize: 12, margin: [0, 0, 0, 22] },
    { text: guideContent.front.title, bold: true, fontSize: 22, alignment: "center", margin: [0, 0, 0, 8] },
    {
      table: {
        widths: [168],
        body: [[{
          qr: registrationUrl,
          fit: 144,
          eccLevel: "M",
          foreground: "#000000",
          background: "#ffffff",
          alignment: "center",
          margin: [12, 12, 12, 12],
        }]],
      },
      alignment: "center",
      layout: {
        hLineColor: () => "#cbd5e1",
        vLineColor: () => "#cbd5e1",
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14],
    },
    { text: guideContent.front.instruction, alignment: "center", color: "#334155", fontSize: 11, lineHeight: 1.25, margin: [36, 0, 36, 12] },
    { text: registrationUrl, link: registrationUrl, alignment: "center", color: "#1d4ed8", fontSize: 8.5, margin: [0, 0, 0, 20] },
    { text: guideContent.front.privacy, alignment: "center", color: "#475569", fillColor: "#f1f5f9", fontSize: 9.5, lineHeight: 1.2, margin: [20, 12, 20, 12] },
    { text: guideContent.back.title, pageBreak: "before", bold: true, fontSize: 26, color: "#0f172a", margin: [0, 0, 0, 5] },
    { text: `${facilityName} · ${organizationName}`, color: "#475569", fontSize: 11, margin: [0, 0, 0, 22] },
    ...steps,
    { text: guideContent.back.safety, color: "#7c2d12", fillColor: "#fff7ed", bold: true, fontSize: 9.5, lineHeight: 1.2, margin: [12, 10, 12, 10] },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Install directly", bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
            { text: [{ text: "iPhone: ", bold: true }, { text: "App Store", link: appStoreUrl, color: "#1d4ed8" }], fontSize: 9.5 },
            { text: [{ text: "Android: ", bold: true }, { text: "Google Play", link: googlePlayUrl, color: "#1d4ed8" }], fontSize: 9.5, margin: [0, 3, 0, 0] },
          ],
        },
        { width: "*", stack: [{ text: "Need help?", bold: true, fontSize: 11, margin: [0, 0, 0, 5] }, { text: supportLine, color: "#334155", fontSize: 9.5, lineHeight: 1.2 }] },
      ],
      columnGap: 24,
      margin: [0, 17, 0, 0],
    },
  ],
  footer(currentPage, pageCount) {
    return { text: `Inspection-Trac facility access · Revision ${packetRevision} · Page ${currentPage} of ${pageCount}`, alignment: "center", color: "#64748b", fontSize: 8, margin: [48, 10, 48, 0] };
  },
  defaultStyle: { font: "Roboto", color: "#0f172a" },
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

console.log(JSON.stringify({ outputPath, facilityName, registrationUrl, packetRevision, pages: 2 }));
