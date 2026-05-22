"use client";

import type { BufferOptions, TDocumentDefinitions } from "pdfmake/interfaces";
import { robotoFontDefinition, robotoVfs } from "@/lib/pdfFonts";

type PdfMakeType = {
  createPdf(
    documentDefinitions: TDocumentDefinitions,
    options?: BufferOptions
  ): {
    getBlob(callback: (blob: Blob) => void): void;
  };
  fonts: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>;
  vfs: Record<string, string>;
};

let pdfMake: PdfMakeType | null = null;

async function getPdfMake(): Promise<PdfMakeType> {
  if (pdfMake) {
    return pdfMake;
  }
  const mod = await import("pdfmake/build/pdfmake");
  const resolved = (mod.default ?? mod) as PdfMakeType;
  resolved.vfs = robotoVfs;
  resolved.fonts = robotoFontDefinition;
  pdfMake = resolved;
  return resolved;
}

export async function createPdfBlob(def: TDocumentDefinitions): Promise<Blob> {
  const pdfMaker = await getPdfMake();
  return new Promise((resolve, reject) => {
    pdfMaker.createPdf(def).getBlob((blob: Blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to build PDF"));
      }
    });
  });
}


