import { expect, test, vi } from "vitest";

vi.mock("pdfmake/build/pdfmake", () => {
  return {
    default: {
      createPdf: vi.fn(() => ({
        getBlob: (cb: (blob: Blob) => void) => cb(new Blob()),
      })),
    },
  };
});

import { createPdfBlob } from "@/lib/docufit/pdfClient";
import { buildPdfDefinition } from "@/lib/docufit/exportUtils";

test("createPdf called", async () => {
  const def = buildPdfDefinition({ rows: [], generatedAt: "20260403" });
  await expect(createPdfBlob(def)).resolves.toBeInstanceOf(Blob);
});
