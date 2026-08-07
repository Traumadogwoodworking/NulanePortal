import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake-node");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1].trim() : fallback;
}

const facilityName = argument("facility", "Chicago Heights");
const organizationName = argument("organization", "Inspection-Trac");
const registrationUrl = argument("url", "https://inspection-trac.com/join/chicago-heights");
const supportName = argument("support-name", "Inspection-Trac Support");
const supportEmail = argument("support-email", "support@inspection-trac.com");
const appStoreUrl = argument("ios-url", "https://apps.apple.com/us/app/inspection-trac/id6774376762");
const googlePlayUrl = argument("android-url", "https://play.google.com/store/apps/details?id=com.nulanesystems.inspectiontrac");
const outputPath = path.resolve(
  argument("output", path.join(projectRoot, "output/pdf/chicago-heights-inspection-trac-quick-start.pdf"))
);

const contentPath = path.join(
  projectRoot,
  "src/components/facilities/facilityStartupGuideContent.json"
);
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
  stack: [
    { text: `${index + 1}. ${step.title}`, bold: true, fontSize: 11.5, margin: [0, 0, 0, 2] },
    { text: step.detail, color: "#475569", fontSize: 9.5, lineHeight: 1.15, margin: [0, 0, 0, 7] },
  ],
}));

const definition = {
  info: {
    title: `${facilityName} Inspection-Trac Quick Start`,
    author: "Nulane Systems",
    subject: `Secure facility registration for ${facilityName}`,
  },
  pageSize: "LETTER",
  pageMargins: [48, 36, 48, 34],
  content: [
    { text: "INSPECTION-TRAC", color: "#64748b", bold: true, fontSize: 9.5, characterSpacing: 2 },
    { text: `Get started at ${facilityName}`, bold: true, fontSize: 23, color: "#0f172a", margin: [0, 7, 0, 3] },
    { text: organizationName, color: "#475569", fontSize: 10.5, margin: [0, 0, 0, 10] },
    { qr: registrationUrl, fit: 170, eccLevel: "M", alignment: "center", margin: [0, 0, 0, 6] },
    { text: "Scan to register", alignment: "center", bold: true, fontSize: 13, color: "#0f172a" },
    { text: registrationUrl, link: registrationUrl, alignment: "center", color: "#1d4ed8", fontSize: 8, margin: [0, 3, 0, 13] },
    ...steps,
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Install directly", bold: true, fontSize: 10.5, margin: [0, 3, 0, 3] },
            { text: [{ text: "iPhone: ", bold: true }, { text: "App Store", link: appStoreUrl, color: "#1d4ed8" }], fontSize: 9 },
            { text: [{ text: "Android: ", bold: true }, { text: "Google Play", link: googlePlayUrl, color: "#1d4ed8" }], fontSize: 9, margin: [0, 2, 0, 0] },
          ],
        },
        {
          width: "*",
          stack: [
            { text: "Need help?", bold: true, fontSize: 10.5, margin: [0, 3, 0, 3] },
            { text: supportName, fontSize: 9 },
            { text: supportEmail, link: `mailto:${supportEmail}`, color: "#1d4ed8", fontSize: 9, margin: [0, 2, 0, 0] },
          ],
        },
      ],
      columnGap: 18,
      margin: [0, 2, 0, 0],
    },
  ],
  footer(currentPage, pageCount) {
    return {
      text: `Inspection-Trac facility registration | Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      color: "#64748b",
      fontSize: 7.5,
      margin: [48, 8, 48, 0],
    };
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

console.log(JSON.stringify({ outputPath, facilityName, registrationUrl }));
