import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecordForm } from "@/components/shared/record-form";
import { EmptyState } from "@/components/shared/common";
const saveVehicle = vi.fn().mockResolvedValue("new");
const saveRecord = vi
  .fn()
  .mockRejectedValue(new Error("Connection interrupted. Retry."));
vi.mock("@/features/auth/provider", () => ({
  useAuth: () => ({ demo: true }),
}));
vi.mock("@/features/vehicles/data-provider", () => ({
  useData: () => ({
    repo: { saveVehicle, saveRecord },
    vehicles: [
      { id: "v", brand: "Honda", model: "Test", currentOdometerKm: 1000 },
    ],
    selectedId: "v",
    select: vi.fn(),
    refresh: vi.fn(),
  }),
}));
describe("forms and empty states", () => {
  it("shows an actionable empty dashboard state", () => {
    const action = vi.fn();
    render(
      <EmptyState
        title="Add your first vehicle"
        description="A home for every ride"
        action="Add vehicle"
        onAction={action}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add vehicle" }));
    expect(action).toHaveBeenCalled();
  });
  it("vehicle form shows required-field errors", async () => {
    render(<RecordForm target={{ kind: "vehicle" }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Brand is required.")).toBeVisible();
    expect(saveVehicle).not.toHaveBeenCalled();
  });
  it("service form reports write failures", async () => {
    render(
      <RecordForm
        target={{ kind: "serviceRecords", vehicleId: "v" }}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Maintenance category/), {
      target: { value: "Engine oil" },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: "Oil change" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Connection interrupted",
      ),
    );
  });
});
