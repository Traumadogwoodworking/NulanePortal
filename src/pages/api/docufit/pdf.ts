import type { NextApiRequest, NextApiResponse } from "next";
import PdfPrinter from "pdfmake";
import { buildPdfDefinition } from "@/lib/docufit/exportUtils";
import type { MeasurementExportRow } from "@/lib/docufit/exportUtils";
import pdfFonts from "pdfmake/build/vfs_fonts.js";

const fonts = {
  Roboto: {
    normal: pdfFonts.pdfMake.vfs["Roboto-Regular.ttf"],
    bold: pdfFonts.pdfMake.vfs["Roboto-Medium.ttf"],
  },
};

type PdfRequestBody = {
  rows?: MeasurementExportRow[];
  chartImageUrl?: string | null;
  orgLabel?: string | null;
  locationLabel?: string | null;
  generatedAt?: string;
  fileTimestamp?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const {
    rows = [],
    chartImageUrl = undefined,
    orgLabel = undefined,
    locationLabel = undefined,
    generatedAt = undefined,
    fileTimestamp,
  } = req.body as PdfRequestBody;

  try {
    const printer = new PdfPrinter(fonts);
    const docDefinition = buildPdfDefinition({ rows, chartImageUrl, orgLabel, locationLabel, generatedAt });
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    pdfDoc.on("error", (error: Error) => {
      console.error("PDF generator error", error);
      if (!res.writableEnded) {
        res.status(500).end();
      }
    });

    pdfDoc.on("end", () => {
      if (res.writableEnded) {
        return;
      }
      const safeTimestamp =
        fileTimestamp?.replace(/[^0-9]/g, "") ??
        new Date().toISOString().split("T")[0].replace(/-/g, "");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="docufit-measurements-${safeTimestamp}.pdf"`
      );
      res.send(Buffer.concat(chunks));
    });

    pdfDoc.end();
  } catch (error) {
    console.error("PDF route error", error);
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
}


