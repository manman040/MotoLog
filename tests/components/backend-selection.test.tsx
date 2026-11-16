import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  realVehicles: vi.fn().mockRejectedValue(new Error("Database setup pending")),
  demoVehicles: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/auth/provider", () => ({
  useAuth: () => ({
    demo: false,
    user: { uid: "real-owner", backend: "supabase" },
  }),
}));
vi.mock("@/lib/supabase/repository", () => ({
  createSupabaseRepository: () => ({ vehicles: mocks.realVehicles }),
}));
vi.mock("@/lib/firebase/repository", () => ({
  createFirebaseRepository: vi.fn(),
}));
vi.mock("@/lib/demo/repository", () => ({
  demoRepository: { vehicles: mocks.demoVehicles },
}));
import { DataProvider } from "@/features/vehicles/data-provider";
it("never replaces a failed real account query with sample/demo records", async () => {
  render(
    <DataProvider>
      <div>Account workspace</div>
    </DataProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database setup pending",
  );
  expect(mocks.realVehicles).toHaveBeenCalled();
  expect(mocks.demoVehicles).not.toHaveBeenCalled();
});
