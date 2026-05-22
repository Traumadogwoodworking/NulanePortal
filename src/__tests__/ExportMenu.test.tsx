import { axe } from "vitest-axe";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExportMenu } from "@/components/docufit/ExportMenu";

describe("ExportMenu", () => {
  it("opens the menu and triggers export actions", async () => {
    const csvHandler = vi.fn();
    const pdfHandler = vi.fn();
    render(<ExportMenu onExportCsv={csvHandler} onExportPdf={pdfHandler} />);

    const exportTrigger = screen.getByRole("button", { name: /export/i });
    fireEvent.click(exportTrigger);

    const csvButton = screen.getByRole("button", { name: /export csv/i });
    fireEvent.click(csvButton);
    expect(csvHandler).toHaveBeenCalled();

    fireEvent.click(exportTrigger);
    const pdfButton = screen.getByRole("button", { name: /export pdf/i });
    fireEvent.click(pdfButton);
    expect(pdfHandler).toHaveBeenCalled();

    const { container } = render(
      <ExportMenu onExportCsv={() => {}} onExportPdf={() => {}} csvLoading />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
