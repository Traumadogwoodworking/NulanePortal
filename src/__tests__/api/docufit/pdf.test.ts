import { describe, expect, it, vi } from "vitest";
import { buildPdfDefinition } from "@/lib/docufit/exportUtils";

vi.mock("@/lib/pdfClient", () => ({
  createPdfBlob: vi.fn(async () => new Blob([Buffer.from("pdf")], { type: "application/pdf" })),
}));

describe("DocuFit PDF export", () => {
  it("builds a PDF blob from the current client-side export path", async () => {
    const { createPdfBlob } = await import("@/lib/docufit/pdfClient");
    const definition = buildPdfDefinition({ rows: [], generatedAt: "2026-06-08" });

    await expect(createPdfBlob(definition)).resolves.toBeInstanceOf(Blob);
  });
});
