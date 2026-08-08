import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FacilityYardManager } from "@/components/facilities/FacilityYardManager";
import type { FacilityYard } from "@/lib/types";

const northYard: FacilityYard = {
  yardId: "yard-north",
  name: "North Yard",
  code: "NORTH",
  active: true,
};

describe("FacilityYardManager", () => {
  it("adds a yard with an auto-generated code and no inferred substructure", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <FacilityYardManager
        yards={[]}
        onSave={onSave}
        onRemove={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Add Yard" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Yard name"), "North Storage Yard");
    expect(dialog.getByLabelText("Yard code")).toHaveValue("NORTH-STORAGE-YARD");
    expect(dialog.queryByLabelText("Areas")).not.toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Add yard" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null, {
      name: "North Storage Yard",
      code: "NORTH-STORAGE-YARD",
      active: true,
    }));
  });

  it("requires the exact yard name before removal", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <FacilityYardManager
        yards={[northYard]}
        onSave={vi.fn()}
        onRemove={onRemove}
      />
    );

    expect(screen.queryByText("Areas")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove North Yard" }));

    const dialog = within(screen.getByRole("dialog"));
    const removeButton = dialog.getByRole("button", { name: "Remove yard" });
    const confirmation = dialog.getByLabelText(/Type .*North Yard.* to confirm/i);
    expect(removeButton).toBeDisabled();

    await user.type(confirmation, "north yard");
    expect(removeButton).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, "North Yard");
    expect(removeButton).toBeEnabled();
    await user.click(removeButton);

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(northYard));
  });
});
