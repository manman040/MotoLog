import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@/features/auth/provider", () => ({
  useAuth: () => ({ demo: false }),
}));
vi.mock("@/features/vehicles/data-provider", () => ({
  useData: () => ({
    repo: {
      saveVehicle: mocks.save,
      upload: mocks.upload,
      removeFile: mocks.remove,
    },
    vehicles: [{ id: "other", brand: "Honda", model: "Existing" }],
    selectedId: "other",
    select: vi.fn(),
    refresh: mocks.refresh,
  }),
}));
import { RecordForm } from "@/components/shared/record-form";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.save.mockResolvedValue("new-vehicle");
  mocks.upload.mockResolvedValue("vehicle-photos/owner/new-vehicle/photo.jpg");
  mocks.refresh.mockResolvedValue(undefined);
});
function prepare() {
  render(<RecordForm target={{ kind: "vehicle" }} onClose={mocks.close} />);
  fireEvent.change(screen.getByLabelText("Brand *"), {
    target: { value: "Yamaha" },
  });
  fireEvent.change(screen.getByLabelText("Model *"), {
    target: { value: "Test" },
  });
  fireEvent.change(screen.getByLabelText("Registration number *"), {
    target: { value: "TEST123" },
  });
  const picker = screen.getByLabelText("Vehicle photo");
  expect(picker).toBeEnabled();
  fireEvent.change(picker, {
    target: {
      files: [new File(["image"], "photo.jpg", { type: "image/jpeg" })],
    },
  });
}
it("creates the vehicle before uploading to its own folder and attaches the photo", async () => {
  prepare();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mocks.close).toHaveBeenCalled());
  expect(mocks.save).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ brand: "Yamaha", photoPath: "" }),
  );
  expect(mocks.upload).toHaveBeenCalledWith(
    "new-vehicle",
    expect.any(File),
    "photo",
  );
  expect(mocks.save).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      photoPath: "vehicle-photos/owner/new-vehicle/photo.jpg",
    }),
    "new-vehicle",
  );
});
it("retries a failed photo without creating a duplicate vehicle", async () => {
  mocks.upload.mockRejectedValueOnce(new Error("Storage unavailable"));
  prepare();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your vehicle was saved",
  );
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mocks.close).toHaveBeenCalled());
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.save.mock.calls[1][1]).toBe("new-vehicle");
});
it("rejects an unsupported photo before creating a record", () => {
  prepare();
  fireEvent.change(screen.getByLabelText("Vehicle photo"), {
    target: {
      files: [new File(["pdf"], "receipt.pdf", { type: "application/pdf" })],
    },
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Vehicle photos must be images",
  );
  expect(mocks.save).not.toHaveBeenCalled();
});
