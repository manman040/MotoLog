import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Dashboard from "@/app/(dashboard)/dashboard/page";
import type { Vehicle } from "@/types/domain";

const account = vi.hoisted(() => ({
  uid: "first-owner",
  vehicles: [] as Vehicle[],
  error: "",
}));

vi.mock("@/features/auth/provider", () => ({
  useAuth: () => ({
    user: { uid: account.uid, backend: "supabase", displayName: "Aisha Tan" },
    demo: false,
  }),
}));
vi.mock("@/features/vehicles/data-provider", () => ({
  useData: () => ({ ...account, selectedId: "", loading: false }),
}));
vi.mock("@/hooks/use-overview", () => ({
  useOverview: () => ({ schedules: [], recent: [], loading: false }),
}));
vi.mock("@/hooks/use-summaries", () => ({
  useSummaries: () => ({ summaries: [], loading: false }),
}));
vi.mock("@/components/shared/record-form", () => ({
  RecordForm: ({ target }: { target: { kind: string } }) => (
    <div role="dialog" aria-label={`Add ${target.kind}`} />
  ),
}));

beforeEach(() => {
  localStorage.clear();
  account.uid = "first-owner";
  account.vehicles = [];
  account.error = "";
});

it("greets an owner with an empty garage and opens the add vehicle form", () => {
  render(<Dashboard />);
  expect(
    screen.getByRole("heading", { name: "Welcome to MotoLog, Aisha Tan" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add My First Vehicle" }));
  expect(screen.getByRole("dialog", { name: "Add vehicle" })).toBeInTheDocument();
});

it("remembers a skip per account and keeps Add vehicle available", () => {
  const firstVisit = render(<Dashboard />);
  fireEvent.click(screen.getByRole("button", { name: "Skip for Now" }));
  firstVisit.unmount();

  const laterVisit = render(<Dashboard />);
  expect(screen.queryByRole("button", { name: "Skip for Now" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Add vehicle" }),
  ).toBeInTheDocument();

  account.uid = "another-owner";
  laterVisit.rerender(<Dashboard />);
  expect(screen.getByRole("button", { name: "Skip for Now" })).toBeInTheDocument();
});

it("recognizes an archived vehicle and suppresses onboarding if loading failed", () => {
  account.vehicles = [{ id: "existing", archived: true, type: "car" } as Vehicle];
  const view = render(<Dashboard />);
  expect(screen.queryByRole("button", { name: "Skip for Now" })).toBeNull();

  account.vehicles = [];
  account.error = "Unable to load your garage.";
  view.rerender(<Dashboard />);
  expect(screen.queryByRole("button", { name: "Skip for Now" })).toBeNull();
});
