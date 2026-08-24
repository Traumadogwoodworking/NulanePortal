import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake-node");
const QRCode = require("qrcode");
const sharp = require("sharp");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const signupUrl = "https://vercel-portal-exact.vercel.app/signup/";
const appStoreUrl = "https://apps.apple.com/us/app/definian-inspection/id6778651028";
const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.nulanesystems.definian";
const supportEmail = "support@definian.com";
const outputDir = path.join(projectRoot, "public/resources/definian");
const pdfPath = path.join(outputDir, "definian-inspection-quick-start.pdf");
const qrPngPath = path.join(outputDir, "definian-inspection-signup-qr.png");
const qrSvgPath = path.join(outputDir, "definian-inspection-signup-qr.svg");
const logoSvgPath = path.join(projectRoot, "public/media/definian-logo-inverted-rgb.svg");
const tempDir = path.join(projectRoot, "tmp/pdfs");
const logoPngPath = path.join(tempDir, "definian-logo-inverted.png");
const appLogoPath = path.join(projectRoot, "public/media/definian-logo-chatgpt.png");

const fonts = {
  Roboto: {
    normal: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(projectRoot, "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
  },
};

const colors = {
  navy: "#0d2c71",
  green: "#00ab63",
  ink: "#172033",
  slate: "#526176",
  line: "#dbe3ef",
  paper: "#f4f7fb",
  paleGreen: "#e8f8f0",
  white: "#ffffff",
};

const steps = [
  ["Scan or open the signup link", "Use the QR code or the permanent Definian signup URL."],
  ["Create your account", "Use your work email and complete Auth0 email verification when prompted."],
  ["Open the Definian portal", "After verification, sign in and return to the Definian home page."],
  ["Install Definian Inspection", "Use the verified iPhone, iPad, or Android store link below."],
  ["Use the same verified email", "Sign in to the Definian app with the same account you created in the portal."],
];

function stepRow([title, detail], index) {
  return {
    columns: [
      {
        width: 30,
        text: String(index + 1),
        alignment: "center",
        bold: true,
        color: colors.white,
        fillColor: colors.navy,
        margin: [0, 6, 0, 6],
      },
      {
        width: "*",
        stack: [
          { text: title, bold: true, fontSize: 11, color: colors.ink, margin: [0, 0, 0, 2] },
          { text: detail, fontSize: 9, color: colors.slate, lineHeight: 1.18 },
        ],
        margin: [0, 2, 0, 0],
      },
    ],
    columnGap: 11,
    margin: [0, 0, 0, index === steps.length - 1 ? 0 : 10],
  };
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });
await Promise.all([
  QRCode.toFile(qrPngPath, signupUrl, { width: 900, margin: 4, errorCorrectionLevel: "M", color: { dark: colors.navy, light: colors.white } }),
  QRCode.toFile(qrSvgPath, signupUrl, { type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: colors.navy, light: colors.white } }),
  sharp(logoSvgPath).resize({ width: 960 }).png().toFile(logoPngPath),
]);

const definition = {
  info: {
    title: "Definian Inspection Quick Start",
    author: "Definian Inspection",
    subject: "Secure Definian signup and Definian Inspection installation guide",
  },
  pageSize: "LETTER",
  pageMargins: [42, 38, 42, 38],
  background: {
    canvas: [
      { type: "rect", x: 0, y: 0, w: 612, h: 792, color: colors.paper },
      { type: "rect", x: 0, y: 0, w: 612, h: 170, color: colors.navy },
      { type: "rect", x: 0, y: 170, w: 612, h: 6, color: colors.green },
    ],
  },
  content: [
    { image: logoPngPath, width: 235, margin: [0, 2, 0, 12] },
    { text: "SECURE ACCOUNT QUICK START", color: "#8ae1b8", bold: true, fontSize: 9, characterSpacing: 1.8 },
    { text: "Scan. Create. Start inspecting.", color: colors.white, bold: true, fontSize: 24, margin: [0, 5, 0, 64] },
    {
      columns: [
        {
          width: 190,
          table: {
            widths: [166],
            body: [[{
              stack: [
                { text: "SCAN TO SIGN UP", alignment: "center", bold: true, fontSize: 9, color: colors.navy, margin: [0, 0, 0, 8] },
                { qr: signupUrl, fit: 150, eccLevel: "M", foreground: colors.navy, background: colors.white, alignment: "center" },
                { text: "Definian Inspection", alignment: "center", bold: true, fontSize: 9, color: colors.ink, margin: [0, 8, 0, 0] },
              ],
              fillColor: colors.white,
              margin: [12, 12, 12, 12],
            }]],
          },
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
        {
          width: "*",
          stack: [
            { text: "Your first five steps", bold: true, fontSize: 17, color: colors.ink, margin: [0, 0, 0, 13] },
            ...steps.map(stepRow),
          ],
          margin: [0, 2, 0, 0],
        },
      ],
      columnGap: 24,
    },
    {
      table: {
        widths: ["*"],
        body: [[{
          text: "Safe to print and post: the QR code contains only the permanent Definian signup URL. It contains no employee name, email, password, invitation, or permission.",
          color: colors.navy,
          bold: true,
          fontSize: 8.8,
          lineHeight: 1.18,
          fillColor: colors.paleGreen,
          margin: [12, 9, 12, 9],
        }]],
      },
      layout: "noBorders",
      margin: [0, 18, 0, 15],
    },
    {
      columns: [
        {
          width: 62,
          image: appLogoPath,
          fit: [54, 54],
        },
        {
          width: "*",
          stack: [
            { text: "Install Definian Inspection", bold: true, fontSize: 12, color: colors.ink, margin: [0, 0, 0, 5] },
            { text: [{ text: "iPhone: ", bold: true }, { text: "Open the App Store", link: appStoreUrl, color: colors.navy }], fontSize: 9 },
            { text: [{ text: "Android: ", bold: true }, { text: "Open Google Play", link: googlePlayUrl, color: colors.navy }], fontSize: 9, margin: [0, 4, 0, 0] },
          ],
        },
        {
          width: 175,
          stack: [
            { text: "Need help?", bold: true, fontSize: 11, color: colors.ink, margin: [0, 0, 0, 5] },
            { text: supportEmail, link: `mailto:${supportEmail}`, color: colors.navy, fontSize: 9 },
            { text: signupUrl, link: signupUrl, color: colors.slate, fontSize: 7.5, margin: [0, 5, 0, 0] },
          ],
        },
      ],
      columnGap: 12,
    },
  ],
  footer: {
    columns: [
      { width: "*", text: "Definian Inspection" },
      { width: "auto", text: "Quick start - Revision 2" },
    ],
    color: "#708097",
    fontSize: 7.5,
    margin: [42, 10, 42, 0],
  },
  defaultStyle: { font: "Roboto", color: colors.ink },
};

const printer = new PdfPrinter(fonts);
const pdf = printer.createPdfKitDocument(definition);
const output = fs.createWriteStream(pdfPath);
pdf.pipe(output);
pdf.end();

await new Promise((resolve, reject) => {
  output.on("finish", resolve);
  output.on("error", reject);
  pdf.on("error", reject);
});

console.log(JSON.stringify({ pdfPath, qrPngPath, qrSvgPath, signupUrl }, null, 2));
