import type {
  AnyRecord,
  MonthlySummary,
  Page,
  RecordKind,
  RecordMap,
  Vehicle,
} from "@/types/domain";
import type { Repository } from "@/lib/firebase/repository";
import { canonicalExpense } from "@/lib/firebase/repository";
import { validateReading } from "@/features/odometer/validation";
import { today } from "@/lib/formatting";
import {
  documentSchema,
  expenseSchema,
  fuelSchema,
  odometerSchema,
  scheduleSchema,
  serviceSchema,
  validateUpload,
  vehicleSchema,
} from "@/lib/validation/schemas";
type State = {
  vehicles: Vehicle[];
  records: Record<string, Partial<{ [K in RecordKind]: RecordMap[K][] }>>;
};
const KEY = "motolog-demo-v1";
const stamp = () => new Date().toISOString();
function seed(): State {
  const base = {
    ownerUid: "demo",
    variant: "",
    fuelType: "Petrol",
    transmission: "Manual",
    purchaseDate: "",
    photoPath: "",
    archived: false,
    createdAt: stamp(),
    updatedAt: stamp(),
    latestReadingDate: today(),
    latestLogId: "",
  };
  const vehicles: Vehicle[] = [
    {
      ...base,
      id: "sample-griffin",
      type: "motorcycle",
      brand: "WMoto",
      model: "Griffin",
      year: 2024,
      registrationNumber: "SAMPLE01",
      nickname: "The daily ride",
      currentOdometerKm: 9500,
    },
    {
      ...base,
      id: "sample-s70",
      type: "car",
      brand: "Proton",
      model: "S70",
      variant: "Flagship",
      year: 2024,
      registrationNumber: "SAMPLE02",
      nickname: "Weekend companion",
      transmission: "Automatic",
      currentOdometerKm: 18240,
    },
    {
      ...base,
      id: "sample-rs150",
      type: "motorcycle",
      brand: "Honda",
      model: "RS150",
      year: 2023,
      registrationNumber: "SAMPLE03",
      nickname: "City runner",
      currentOdometerKm: 12800,
    },
  ];
  const records: State["records"] = {};
  for (const v of vehicles) records[v.id] = {};
  const current = today();
  records["sample-griffin"].maintenanceSchedules = [
    {
      id: "sample-oil",
      vehicleId: "sample-griffin",
      categoryId: "Engine oil",
      intervalKm: null,
      intervalMonths: null,
      nextDueKm: 10000,
      nextDueDate: "",
      warningKm: 500,
      warningDays: 14,
      active: true,
      completed: false,
    },
    {
      id: "sample-chain",
      vehicleId: "sample-griffin",
      categoryId: "Chain inspection",
      intervalKm: null,
      intervalMonths: null,
      nextDueKm: 9400,
      nextDueDate: "",
      warningKm: 300,
      warningDays: 7,
      active: true,
      completed: false,
    },
  ];
  records["sample-s70"].maintenanceSchedules = [
    {
      id: "sample-tyres",
      vehicleId: "sample-s70",
      categoryId: "Tyre inspection",
      intervalKm: null,
      intervalMonths: null,
      nextDueKm: 20000,
      nextDueDate: "",
      warningKm: 500,
      warningDays: 14,
      active: true,
      completed: false,
    },
  ];
  records["sample-griffin"].serviceRecords = [
    {
      id: "sample-service",
      vehicleId: "sample-griffin",
      categoryId: "Engine oil",
      serviceDate: current,
      odometerKm: 9000,
      description: "Oil and filter replacement",
      workshop: "Sample workshop",
      costSen: 8500,
      notes: "Illustrative sample record only.",
      receiptPath: "",
      nextDueKm: 10000,
      nextDueDate: "",
      createdAt: stamp(),
    },
  ];
  records["sample-griffin"].expenses = [
    {
      id: "service_sample-service",
      vehicleId: "sample-griffin",
      category: "Maintenance",
      amountSen: 8500,
      expenseDate: current,
      description: "Oil and filter replacement",
      odometerKm: 9000,
      receiptPath: "",
      sourceType: "service",
      sourceRecordId: "sample-service",
      createdAt: stamp(),
    },
  ];
  for (let i = 0; i < 6; i++) {
    const d = new Date(`${current}T12:00:00`);
    d.setMonth(d.getMonth() - i);
    const day = d.toISOString().slice(0, 10);
    const target = records[i % 2 ? "sample-s70" : "sample-griffin"];
    const id = `sample-expense-${i}`;
    target.expenses ??= [];
    target.expenses.push({
      id,
      vehicleId: i % 2 ? "sample-s70" : "sample-griffin",
      category: i % 2 ? "Fuel" : "Accessories",
      amountSen: [4500, 18000, 3200, 14500, 6500, 21000][i],
      expenseDate: day,
      description: "Sample expense",
      odometerKm: null,
      receiptPath: "",
      sourceType: "manual",
      sourceRecordId: "",
      createdAt: stamp(),
    });
  }
  return { vehicles, records };
}
function read(): State {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Demo storage is damaged. Reset demo data in Settings.");
    }
  }
  const state = seed();
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}
function write(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function resetDemo() {
  localStorage.removeItem(KEY);
}
export const demoRepository: Repository = {
  async vehicles() {
    return read().vehicles;
  },
  async saveVehicle(input, id) {
    const data = vehicleSchema.parse(input);
    const state = read();
    if (
      state.vehicles.some(
        (v) => v.id !== id && v.registrationNumber === data.registrationNumber,
      )
    )
      throw new Error("Registration already exists in this garage.");
    const existing = state.vehicles.find((v) => v.id === id);
    if (existing && existing.currentOdometerKm !== data.currentOdometerKm)
      throw new Error("Use Add mileage to update the odometer.");
    const vehicleId = id || crypto.randomUUID();
    const result: Vehicle = {
      ...existing,
      ...data,
      id: vehicleId,
      ownerUid: "demo",
      archived: input.archived ?? false,
      latestReadingDate: existing?.latestReadingDate || today(),
      latestLogId: existing?.latestLogId || "",
      createdAt: existing?.createdAt || stamp(),
      updatedAt: stamp(),
    };
    state.vehicles = existing
      ? state.vehicles.map((v) => (v.id === id ? result : v))
      : [...state.vehicles, result];
    state.records[vehicleId] ??= {};
    write(state);
    return vehicleId;
  },
  async records<K extends RecordKind>(
    vehicleId: string,
    kind: K,
    cursor?: unknown,
  ): Promise<Page<RecordMap[K]>> {
    const dateField = {
      serviceRecords: "serviceDate",
      expenses: "expenseDate",
      fuelLogs: "date",
      maintenanceSchedules: "updatedAt",
      documents: "expiryDate",
      odometerLogs: "recordedAt",
    }[kind];
    const all = [
      ...(read().records[vehicleId]?.[kind] || []),
    ] as RecordMap[K][];
    all.sort(
      (a, b) =>
        String(
          (b as unknown as Record<string, unknown>)[dateField] || "",
        ).localeCompare(
          String((a as unknown as Record<string, unknown>)[dateField] || ""),
        ) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
    const start = typeof cursor === "number" ? cursor : 0;
    return {
      items: all.slice(start, start + 20),
      cursor: start + 20,
      hasMore: all.length > start + 20,
    };
  },
  async saveRecord(vehicleId, kind, input, id) {
    const state = read();
    const v = state.vehicles.find((v) => v.id === vehicleId);
    if (!v || v.archived) throw new Error("Select an active vehicle.");
    const data: Record<string, unknown> = {
      serviceRecords: serviceSchema,
      expenses: expenseSchema,
      fuelLogs: fuelSchema,
      maintenanceSchedules: scheduleSchema,
      documents: documentSchema,
      odometerLogs: odometerSchema,
    }[kind].parse(input);
    const recordId = id || crypto.randomUUID();
    const bucket = (state.records[vehicleId] ??= {});
    const items = (bucket[kind] || []) as AnyRecord[];
    const existing = items.find((r) => r.id === id);
    if (
      kind === "expenses" &&
      existing &&
      "sourceType" in existing &&
      existing.sourceType !== "manual"
    )
      throw new Error("Edit the linked service or fuel log.");
    if (kind === "odometerLogs") {
      validateReading(
        v,
        Number(data.readingKm),
        String(data.recordedAt),
        Boolean(data.correction),
        String(data.note),
      );
      Object.assign(data, { previousReadingKm: v.currentOdometerKm });
      v.currentOdometerKm = Number(data.readingKm);
      v.latestReadingDate = String(data.recordedAt);
      v.latestLogId = recordId;
    }
    if (
      (kind === "fuelLogs" || kind === "serviceRecords") &&
      Number(data.odometerKm) > v.currentOdometerKm
    )
      throw new Error("Update the odometer first.");
    const saved = {
      ...data,
      id: recordId,
      vehicleId,
      createdAt: existing?.createdAt || stamp(),
      updatedAt: stamp(),
    };
    if (kind === "expenses")
      Object.assign(saved, { sourceType: "manual", sourceRecordId: "" });
    Object.assign(bucket, {
      [kind]: existing
        ? items.map((r) => (r.id === recordId ? saved : r))
        : [saved, ...items],
    });
    const expense = canonicalExpense(kind, data, recordId);
    if (expense && kind !== "expenses") {
      const eId = `${kind === "fuelLogs" ? "fuel" : "service"}_${recordId}`;
      bucket.expenses = [
        { ...expense, id: eId, vehicleId, createdAt: stamp() },
        ...(bucket.expenses || []).filter((e) => e.id !== eId),
      ];
    }
    write(state);
    return recordId;
  },
  async removeRecord(vehicleId, kind, id) {
    if (kind === "odometerLogs")
      throw new Error("Add a correction to preserve odometer history.");
    const state = read();
    const bucket = state.records[vehicleId];
    const existing = (bucket[kind] || []).find((r) => r.id === id);
    if (
      kind === "expenses" &&
      existing &&
      "sourceType" in existing &&
      existing.sourceType !== "manual"
    )
      throw new Error(
        "Delete the original record to remove its linked expense.",
      );
    Object.assign(bucket, {
      [kind]: (bucket[kind] || []).filter((r) => r.id !== id),
    });
    if (["serviceRecords", "fuelLogs"].includes(kind)) {
      bucket.expenses = (bucket.expenses || []).filter(
        (e) => e.id !== `${kind === "fuelLogs" ? "fuel" : "service"}_${id}`,
      );
    }
    write(state);
  },
  async summaries(year) {
    const output: Record<string, MonthlySummary> = {};
    for (const [vehicleId, bucket] of Object.entries(read().records)) {
      for (const e of bucket.expenses || []) {
        if (!e.expenseDate.startsWith(String(year))) continue;
        const month = e.expenseDate.slice(0, 7);
        const s = (output[month] ??= {
          id: month,
          month,
          totalSen: 0,
          categories: {},
          vehicles: {},
        });
        s.totalSen += e.amountSen;
        s.categories[e.category] =
          (s.categories[e.category] || 0) + e.amountSen;
        s.vehicles[vehicleId] = (s.vehicles[vehicleId] || 0) + e.amountSen;
      }
    }
    return Object.values(output).sort((a, b) => a.month.localeCompare(b.month));
  },
  async upload(_id, file) {
    validateUpload(file);
    throw new Error(
      "Demo mode does not persist files. Connect Firebase Storage to upload documents.",
    );
  },
  async fileURL() {
    throw new Error("Sample records have no uploaded files.");
  },
  async removeFile() {
    throw new Error("File storage is unavailable in demo mode.");
  },
};
