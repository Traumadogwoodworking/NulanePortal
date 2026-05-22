import { renderToStaticMarkup } from "react-dom/server";
import { DOCUFIT_TOLERANCE_MM, ToleranceAlert, hasToleranceViolation } from "../components/docufit/ToleranceAlert";

describe("ToleranceAlert", () => {
  it("flags values above the tolerance", () => {
    expect(hasToleranceViolation([{ dimension: "height", value: DOCUFIT_TOLERANCE_MM + 0.1, tolerance: DOCUFIT_TOLERANCE_MM }])).toBe(true);
  });

  it("renders a red alert state when values exceed tolerance", () => {
    const markup = renderToStaticMarkup(
      <ToleranceAlert
        measurements={[
          {
            dimension: "height",
            value: DOCUFIT_TOLERANCE_MM + 2,
            tolerance: DOCUFIT_TOLERANCE_MM,
          },
        ]}
      />
    );
    expect(markup).toContain("border-red-200");
    expect(markup).toContain("Out of tolerance");
  });
});
