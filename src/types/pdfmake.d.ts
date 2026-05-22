import type { BufferOptions, TCreatedPdf, TDocumentDefinitions } from "pdfmake/interfaces";
import type { PDFDocument } from "pdfkit";

declare module "pdfmake" {
  export interface PdfPrinterFonts {
    normal: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  }

  export default class PdfPrinter {
    constructor(fonts: Record<string, PdfPrinterFonts>);
    createPdfKitDocument(documentDefinitions: TDocumentDefinitions): PDFDocument;
  }
}

import type { BufferOptions, TDocumentDefinitions, TCreatedPdf } from "pdfmake/interfaces";

declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf(documentDefinitions: TDocumentDefinitions, options?: BufferOptions): TCreatedPdf;
    fonts: Record<string, PdfPrinterFonts>;
    vfs: Record<string, string>;
    addFonts(fonts: Record<string, PdfPrinterFonts>): void;
  };
  export default pdfMake;
}

