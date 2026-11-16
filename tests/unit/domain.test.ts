import { describe, it, expect } from "vitest";
import { reminderStatus } from "@/features/reminders/calculations";
import { validateReading } from "@/features/odometer/validation";
import { fuelMetrics } from "@/features/fuel/calculations";
import { recordedDistance } from "@/features/odometer/calculations";
import type { OdometerLog } from "@/types/domain";
import { expenseTotal } from "@/features/expenses/calculations";
import { money, toSen } from "@/lib/formatting";
import { vehicleSchema, serviceSchema } from "@/lib/validation/schemas";
import type { FuelLog } from "@/types/domain";
const schedule = {
  completed: false,
  nextDueKm: 10000,
  nextDueDate: "2026-12-01",
  warningKm: 500,
  warningDays: 14,
};
it("does not count correction jumps as distance travelled", () => {
  const logs = [
    { readingKm: 1100, previousReadingKm: 1000, correction: false },
    { readingKm: 900, previousReadingKm: 1100, correction: true },
    { readingKm: 950, previousReadingKm: 900, correction: false },
  ] as OdometerLog[];
  expect(recordedDistance(logs)).toBe(150);
});
describe("maintenance and reminders", () => {
  it("warns at mileage boundary", () =>
    expect(reminderStatus(schedule, 9500, "2026-11-01")).toBe("Due soon"));
  it("is due when either date or mileage reaches threshold", () => {
    expect(reminderStatus(schedule, 5000, "2026-12-01")).toBe("Due");
    expect(reminderStatus(schedule, 10000, "2026-11-01")).toBe("Due");
  });
  it("overdue wins when other criterion is upcoming", () =>
    expect(reminderStatus(schedule, 5000, "2026-12-02")).toBe("Overdue"));
  it("completed wins", () =>
    expect(
      reminderStatus({ ...schedule, completed: true }, 11000, "2026-12-02"),
    ).toBe("Completed"));
  it("handles mileage-only and date-only thresholds", () => {
    expect(
      reminderStatus({ ...schedule, nextDueDate: "" }, 10001, "2026-11-01"),
    ).toBe("Overdue");
    expect(
      reminderStatus({ ...schedule, nextDueKm: null }, 100000, "2026-11-01"),
    ).toBe("Upcoming");
  });
});
describe("odometer", () => {
  const vehicle = { currentOdometerKm: 1000, latestReadingDate: "2026-01-01" };
  it("rejects negative, fractional and decreasing readings", () => {
    for (const v of [-1, 2.5, 999])
      expect(() =>
        validateReading(vehicle, v, "2026-01-02", false, ""),
      ).toThrow();
  });
  it("requires explicit correction reason", () => {
    expect(() =>
      validateReading(vehicle, 900, "2026-01-02", true, ""),
    ).toThrow();
    expect(() =>
      validateReading(vehicle, 900, "2026-01-02", true, "Instrument replaced."),
    ).not.toThrow();
  });
  it("rejects backdated history rewrites", () =>
    expect(() =>
      validateReading(vehicle, 1100, "2025-12-31", false, ""),
    ).toThrow());
});
describe("money", () => {
  it("stores exact integer sen", () => {
    expect(toSen("0.29")).toBe(29);
    expect(toSen("1200.50")).toBe(120050);
    expect(() => toSen("1.001")).toThrow();
  });
  it("formats Malaysian currency", () =>
    expect(money(12345)).toMatch(/RM\s?123\.45/));
  it("counts linked records once", () => {
    expect(
      expenseTotal([
        { id: "a", amountSen: 100, sourceType: "service", sourceRecordId: "s" },
        { id: "b", amountSen: 100, sourceType: "service", sourceRecordId: "s" },
        { id: "c", amountSen: 20, sourceType: "manual", sourceRecordId: "" },
      ]),
    ).toBe(120);
  });
});
describe("fuel", () => {
  const log = (
    id: string,
    odometerKm: number,
    litres: number,
    fullTank: boolean,
  ): FuelLog => ({
    id,
    vehicleId: "v",
    date: "2026-01-01",
    odometerKm,
    litres,
    totalCostSen: litres * 200,
    fuelType: "Petrol",
    fullTank,
    notes: "",
  });
  it("requires two full tanks", () => {
    expect(
      fuelMetrics([log("a", 100, 10, false), log("b", 200, 10, true)]),
    ).toEqual([]);
  });
  it("includes intermediate partial fills and excludes opening tank", () => {
    const result = fuelMetrics([
      log("a", 100, 30, true),
      log("b", 200, 5, false),
      log("c", 400, 10, true),
    ]);
    expect(result[0].litresPer100Km).toBe(5);
    expect(result[0].costPerKmSen).toBe(10);
  });
  it("ignores zero-distance intervals", () =>
    expect(
      fuelMetrics([log("a", 100, 10, true), log("b", 100, 10, true)]),
    ).toEqual([]));
  it("does not bridge an odometer decrease between full tanks", () => {
    const first = { ...log("a", 1000, 10, true), date: "2026-01-01" };
    const partial = { ...log("b", 900, 5, false), date: "2026-01-02" };
    const last = { ...log("c", 1100, 10, true), date: "2026-01-03" };
    expect(fuelMetrics([first, partial, last])).toEqual([]);
  });
});
it("validates manufacturing year and impossible service dates", () => {
  expect(vehicleSchema.safeParse({ year: 1700 }).success).toBe(false);
  expect(serviceSchema.safeParse({ serviceDate: "2026-02-30" }).success).toBe(
    false,
  );
});
