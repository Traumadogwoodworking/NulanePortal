import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake-node");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const contentPath = path.join(
  projectRoot,
  "src/components/facilities/chicagoHeightsQuickStart.json",
);
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const slug = content.facility.registrationSlug;
const outputPath = path.join(
  projectRoot,
  `public/resources/${slug}/${slug}-quick-start.pdf`,
);
const logoPath = path.join(
  projectRoot,
  "public/media/inspection-trac-center-logo.png",
);
const logo = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

const fonts = {
  Roboto: {
    normal: path.join(
      projectRoot,
      "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf",
    ),
    bold: path.join(
      projectRoot,
      "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf",
    ),
    italics: path.join(
      projectRoot,
      "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf",
    ),
    bolditalics: path.join(
      projectRoot,
      "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
    ),
  },
};

const steps = content.steps.map((step, index) => ({
  columns: [
    {
      width: 22,
      text: `${index + 1}.`,
      alignment: "center",
      bold: true,
      color: "#1d4ed8",
      margin: [0, 4, 0, 4],
    },
    {
      width: "*",
      text: step,
      color: "#334155",
      fontSize: 10.5,
      lineHeight: 1.2,
      margin: [0, 3, 0, 0],
    },
  ],
  columnGap: 10,
  margin: [0, 0, 0, 11],
}));

const definition = {
  info: {
    title: content.title,
    author: "Inspection-Trac",
    subject: content.purpose,
    keywords: `Inspection-Trac, ${content.facility.name}, registration, quick start`,
  },
  pageSize: "LETTER",
  pageMargins: [42, 34, 42, 30],
  content: [
    {
      columns: [
        { image: logo, width: 92, height: 53 },
        {
          width: "*",
          stack: [
            {
              text: content.title,
              bold: true,
              fontSize: 25,
              color: "#0f172a",
              margin: [0, 2, 0, 5],
            },
            {
              text: content.purpose,
              color: "#475569",
              fontSize: 10.5,
              lineHeight: 1.2,
            },
          ],
          margin: [18, 0, 0, 0],
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          width: 188,
          stack: [
            {
              text: "SCAN TO REGISTER",
              alignment: "center",
              bold: true,
              color: "#1d4ed8",
              fontSize: 10,
              characterSpacing: 1.6,
              margin: [0, 0, 0, 8],
            },
            {
              table: {
                widths: [168],
                body: [
                  [
                    {
                      qr: content.registrationUrl,
                      fit: 152,
                      eccLevel: "M",
                      foreground: "#000000",
                      background: "#ffffff",
                      alignment: "center",
                      margin: [8, 8, 8, 8],
                    },
                  ],
                ],
              },
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
            },
            {
              text: content.registrationUrl,
              link: content.registrationUrl,
              alignment: "center",
              color: "#1d4ed8",
              fontSize: 8,
              margin: [0, 10, 0, 0],
            },
          ],
        },
        {
          width: "*",
          stack: [
            {
              text: "SET UP CHICAGO HEIGHTS ACCESS",
              bold: true,
              color: "#0f172a",
              fontSize: 11,
              characterSpacing: 1.1,
              margin: [0, 0, 0, 12],
            },
            ...steps,
          ],
        },
      ],
      columnGap: 30,
      margin: [0, 0, 0, 18],
    },
    {
      columns: [
        {
          width: 210,
          stack: [
            {
              text: "DONE",
              bold: true,
              color: "#166534",
              fontSize: 10,
              characterSpacing: 1.2,
            },
            {
              text: content.done,
              color: "#14532d",
              fontSize: 10,
              lineHeight: 1.25,
              margin: [0, 6, 0, 0],
            },
          ],
          fillColor: "#ecfdf5",
          margin: [14, 12, 14, 12],
        },
        {
          width: "*",
          stack: [
            {
              text: "SUPPORT",
              bold: true,
              color: "#0f172a",
              fontSize: 10,
              characterSpacing: 1.2,
            },
            {
              text: `${content.support.displayName} · ${content.support.email}`,
              link: `mailto:${content.support.email}`,
              bold: true,
              color: "#1d4ed8",
              fontSize: 9,
              margin: [0, 6, 0, 5],
            },
            {
              text: content.support.instruction,
              color: "#475569",
              fontSize: 8.5,
              lineHeight: 1.2,
            },
          ],
          fillColor: "#f8fafc",
          margin: [14, 12, 14, 12],
        },
      ],
      columnGap: 14,
    },
  ],
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

console.log(
  JSON.stringify({
    outputPath,
    title: content.title,
    registrationUrl: content.registrationUrl,
    pages: 1,
  }),
);
