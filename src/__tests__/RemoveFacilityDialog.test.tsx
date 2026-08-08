import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  isExactFacilityRemovalConfirmation,
  RemoveFacilityDialog,
} from "@/components/facilities/RemoveFacilityDialog";

describe("RemoveFacilityDialog", () => {
  it("requires an exact case-sensitive facility-name confirmation", () => {
    expect(isExactFacilityRemovalConfirmation("Chicago", "Chicago")).toBe(true);
    expect(isExactFacilityRemovalConfirmation(" chicago ", "Chicago")).toBe(false);
    expect(isExactFacilityRemovalConfirmation("", "Chicago")).toBe(false);
  });

  it("keeps removal disabled until the exact name is entered", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <RemoveFacilityDialog
        open
        facility={{ id: "facility-chicago", name: "Chicago" }}
        assignedUserCount={2}
        isPending={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const dialog = within(screen.getByRole("dialog"));
    const removeButton = dialog.getByRole("button", { name: "Remove facility" });
    const confirmationInput = dialog.getByLabelText(/Type .*Chicago.* to confirm/i);

    expect(removeButton).toBeDisabled();
    expect(dialog.getByText("2 directly assigned users will lose this facility assignment.")).toBeVisible();

    await user.type(confirmationInput, "chicago");
    expect(removeButton).toBeDisabled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, "Chicago");
    expect(removeButton).toBeEnabled();

    await user.click(removeButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Chicago");
  });
});
