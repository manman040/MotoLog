import { beforeEach, expect, it } from "vitest";
import { demoRepository as repo, resetDemo } from "@/lib/demo/repository";
import { today } from "@/lib/formatting";
beforeEach(() => resetDemo());
it("keeps service, linked expense and monthly summary consistent across edit and delete", async () => {
  const id = await repo.saveRecord("sample-griffin", "serviceRecords", {
    categoryId: "Custom service",
    serviceDate: today(),
    odometerKm: 9500,
    description: "Test service",
    workshop: "Test",
    costSen: 10000,
    notes: "",
    receiptPath: "",
    nextDueKm: null,
    nextDueDate: "",
  });
  let records = await repo.records("sample-griffin", "expenses");
  expect(records.items.find((e) => e.sourceRecordId === id)?.amountSen).toBe(
    10000,
  );
  const before = (await repo.summaries(Number(today().slice(0, 4)))).reduce(
    (s, m) => s + m.totalSen,
    0,
  );
  const s = (await repo.records("sample-griffin", "serviceRecords")).items.find(
    (s) => s.id === id,
  )!;
  await repo.saveRecord(
    "sample-griffin",
    "serviceRecords",
    { ...s, costSen: 15000 },
    id,
  );
  const after = (await repo.summaries(Number(today().slice(0, 4)))).reduce(
    (s, m) => s + m.totalSen,
    0,
  );
  expect(after - before).toBe(5000);
  await repo.removeRecord("sample-griffin", "serviceRecords", id);
  records = await repo.records("sample-griffin", "expenses");
  expect(records.items.some((e) => e.sourceRecordId === id)).toBe(false);
});
it("updates mileage with an immutable correction audit entry", async () => {
  await expect(
    repo.saveRecord("sample-griffin", "odometerLogs", {
      readingKm: 9000,
      recordedAt: today(),
      note: "",
      correction: false,
      previousReadingKm: null,
    }),
  ).rejects.toThrow();
  await repo.saveRecord("sample-griffin", "odometerLogs", {
    readingKm: 9000,
    recordedAt: today(),
    note: "Replaced instrument cluster",
    correction: true,
    previousReadingKm: null,
  });
  expect(
    (await repo.vehicles()).find((v) => v.id === "sample-griffin")
      ?.currentOdometerKm,
  ).toBe(9000);
  expect(
    (await repo.records("sample-griffin", "odometerLogs")).items[0]
      .previousReadingKm,
  ).toBe(9500);
});
