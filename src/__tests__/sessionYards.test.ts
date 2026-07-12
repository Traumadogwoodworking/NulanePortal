import { describe, expect, it } from "vitest";
import { getSessionYardOptions } from "@/lib/sessionYards";
import type { PortalSessionResponse } from "@/lib/types";

function baseSession(overrides: Partial<PortalSessionResponse>): PortalSessionResponse {
  return {
    user: {
      user_id: "user-1",
      organization_id: "org-1",
      is_active: true,
    },
    organization: {
      organization_id: "org-1",
      name: "Inspection Trac",
    },
    ...overrides,
  } as PortalSessionResponse;
}

describe("getSessionYardOptions", () => {
  it("extracts nested yard options from user session facilities and locations", () => {
    const options = getSessionYardOptions(
      baseSession({
        locations: [
          {
            location_id: "it-9a6e0f-locawctshap",
            location_label: "SHAP",
            yards: [{ yard_id: "SHAP-DROPZONE", name: "Dropzone" }],
          },
        ],
        facilities: [
          {
            location_id: "it-9a6e0f-locawctjn",
            location_label: "JNAP",
            metadata: {
              yard_options: [
                { code: "JNAP-DROP-ZONE", label: "Drop Zone" },
                { code: "JNAP-MAIN", label: "Main" },
                { code: "JNAP-BUDD-YARD", label: "Budd Yard" },
              ],
            },
          },
        ],
      })
    );

    expect(options.map((option) => option.value)).toEqual([
      "JNAP-BUDD-YARD",
      "JNAP-DROP-ZONE",
      "JNAP-MAIN",
      "SHAP-DROPZONE",
    ]);
    expect(options.find((option) => option.value === "SHAP-DROPZONE")).toMatchObject({
      label: "Dropzone",
      facilityLabel: "SHAP",
    });
  });
});
