import {
  collection,
  doc,
  documentId,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  type QueryConstraint,
  type Firestore,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { firebase } from "./client";
import type {
  Expense,
  MonthlySummary,
  Page,
  RecordKind,
  RecordMap,
  Vehicle,
} from "@/types/domain";
import { validateReading } from "@/features/odometer/validation";
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
import { today } from "@/lib/formatting";
export interface Repository {
  vehicles(): Promise<Vehicle[]>;
  saveVehicle(values: Partial<Vehicle>, id?: string): Promise<string>;
  records<K extends RecordKind>(
    vehicleId: string,
    kind: K,
    cursor?: unknown,
  ): Promise<Page<RecordMap[K]>>;
  saveRecord<K extends RecordKind>(
    vehicleId: string,
    kind: K,
    data: Omit<RecordMap[K], "id" | "vehicleId">,
    id?: string,
  ): Promise<string>;
  removeRecord(vehicleId: string, kind: RecordKind, id: string): Promise<void>;
  summaries(year: number): Promise<MonthlySummary[]>;
  upload(
    vehicleId: string,
    file: File,
    purpose?: "photo" | "receipt" | "document",
  ): Promise<string>;
  fileURL(path: string): Promise<string>;
  removeFile(path: string): Promise<void>;
}
const schemas = {
  serviceRecords: serviceSchema,
  expenses: expenseSchema,
  fuelLogs: fuelSchema,
  maintenanceSchedules: scheduleSchema,
  documents: documentSchema,
  odometerLogs: odometerSchema,
};
export function canonicalExpense(
  kind: RecordKind,
  data: Record<string, unknown>,
  id: string,
): Omit<Expense, "id" | "vehicleId"> | null {
  if (kind === "expenses")
    return { ...data, sourceType: "manual", sourceRecordId: "" } as Omit<
      Expense,
      "id" | "vehicleId"
    >;
  if (kind === "serviceRecords")
    return {
      category: "Maintenance",
      amountSen: Number(data.costSen),
      expenseDate: String(data.serviceDate),
      description: String(data.description),
      odometerKm: Number(data.odometerKm),
      receiptPath: String(data.receiptPath || ""),
      sourceType: "service",
      sourceRecordId: id,
    };
  if (kind === "fuelLogs")
    return {
      category: "Fuel",
      amountSen: Number(data.totalCostSen),
      expenseDate: String(data.date),
      description: `Fuel · ${data.litres} L`,
      odometerKm: Number(data.odometerKm),
      receiptPath: "",
      sourceType: "fuel",
      sourceRecordId: id,
    };
  return null;
}
export function createFirebaseRepository(
  uid: string,
  services?: { db: Firestore; storage: FirebaseStorage },
): Repository {
  const { db, storage } = services ?? firebase();
  const userRoot = `users/${uid}`;
  const vehiclePath = (id: string) => `${userRoot}/vehicles/${id}`;
  const expenseId = (kind: RecordKind, id: string) =>
    kind === "expenses"
      ? id
      : `${kind === "fuelLogs" ? "fuel" : "service"}_${id}`;
  async function mutate(
    vehicleId: string,
    kind: RecordKind,
    input: Record<string, unknown> | null,
    id: string,
  ) {
    const base = vehiclePath(vehicleId);
    const target = doc(db, `${base}/${kind}/${id}`);
    await runTransaction(db, async (tx) => {
      const vehicleRef = doc(db, base);
      const vehicleSnap = await tx.get(vehicleRef);
      if (!vehicleSnap.exists()) throw new Error("Vehicle no longer exists.");
      const vehicle = vehicleSnap.data() as Vehicle;
      if (vehicle.archived)
        throw new Error("Restore this vehicle before changing its records.");
      const old = await tx.get(target);
      if (
        kind === "expenses" &&
        old.exists() &&
        old.data().sourceType !== "manual"
      )
        throw new Error(
          "Edit the original service or fuel log to change this linked expense.",
        );
      const data: Record<string, unknown> | null = input
        ? schemas[kind].parse(input)
        : null;
      const canonical = data ? canonicalExpense(kind, data, id) : null;
      const financial = ["expenses", "serviceRecords", "fuelLogs"].includes(
        kind,
      );
      const eRef = doc(db, `${base}/expenses/${expenseId(kind, id)}`);
      const oldExpense = financial
        ? kind === "expenses"
          ? old
          : await tx.get(eRef)
        : null;
      if (kind === "odometerLogs") {
        if (!data)
          throw new Error(
            "Odometer history is immutable. Add an explicit correction.",
          );
        validateReading(
          vehicle,
          Number(data.readingKm),
          String(data.recordedAt),
          Boolean(data.correction),
          String(data.note),
        );
        tx.set(target, {
          ...data,
          vehicleId,
          previousReadingKm: vehicle.currentOdometerKm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.update(vehicleRef, {
          currentOdometerKm: data.readingKm,
          latestReadingDate: data.recordedAt,
          latestLogId: id,
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (
        kind === "fuelLogs" &&
        data &&
        Number(data.odometerKm) > vehicle.currentOdometerKm
      )
        throw new Error("Update the odometer first, then add this fuel log.");
      if (
        kind === "serviceRecords" &&
        data &&
        Number(data.odometerKm) > vehicle.currentOdometerKm
      )
        throw new Error("Update the odometer first, then add this service.");
      const oldE = oldExpense?.exists() ? (oldExpense.data() as Expense) : null;
      // Read all summary documents before performing any transaction writes.
      const months = [
        ...new Set(
          [
            oldE?.expenseDate.slice(0, 7),
            canonical?.expenseDate.slice(0, 7),
          ].filter(Boolean) as string[],
        ),
      ];
      const summaryRefs = months.map((month) =>
        doc(db, `${userRoot}/summaries/${month}`),
      );
      const summarySnaps = [];
      for (const summary of summaryRefs)
        summarySnaps.push(await tx.get(summary));
      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const changes: Record<string, unknown> = {
          month,
          updatedAt: serverTimestamp(),
        };
        const oldAmount = oldE?.expenseDate.startsWith(month)
          ? oldE.amountSen
          : 0;
        const newAmount = canonical?.expenseDate.startsWith(month)
          ? canonical.amountSen
          : 0;
        changes.totalSen = increment(newAmount - oldAmount);
        changes[`vehicles.${vehicleId}`] = increment(newAmount - oldAmount);
        const categories = new Set(
          [oldE?.category, canonical?.category].filter(Boolean) as string[],
        );
        for (const category of categories)
          changes[`categories.${category}`] = increment(
            (canonical?.category === category ? newAmount : 0) -
              (oldE?.category === category ? oldAmount : 0),
          );
        const summary = summaryRefs[i];
        const summarySnap = summarySnaps[i];
        if (summarySnap.exists()) tx.update(summary, changes);
        else {
          const cats: Record<string, number> = {};
          for (const category of categories)
            cats[category] =
              (canonical?.category === category ? newAmount : 0) -
              (oldE?.category === category ? oldAmount : 0);
          tx.set(summary, {
            month,
            totalSen: newAmount - oldAmount,
            categories: cats,
            vehicles: { [vehicleId]: newAmount - oldAmount },
            updatedAt: serverTimestamp(),
          });
        }
      }
      if (data)
        tx.set(target, {
          ...data,
          ...(kind === "expenses"
            ? { sourceType: "manual", sourceRecordId: "" }
            : {}),
          vehicleId,
          createdAt: old.data()?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      else tx.delete(target);
      if (financial && kind !== "expenses") {
        if (canonical)
          tx.set(eRef, {
            ...canonical,
            vehicleId,
            createdAt: oldExpense?.data()?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        else tx.delete(eRef);
      }
    });
  }
  return {
    async vehicles() {
      const result = await getDocs(
        query(
          collection(db, `${userRoot}/vehicles`),
          orderBy("createdAt", "desc"),
          limit(100),
        ),
      );
      return result.docs.map((d) => ({ ...d.data(), id: d.id }) as Vehicle);
    },
    async saveVehicle(values, id) {
      const parsed = vehicleSchema.parse(values);
      const vehicleId = id || crypto.randomUUID();
      const target = doc(db, vehiclePath(vehicleId));
      const registration = doc(
        db,
        `${userRoot}/registrations/${parsed.registrationNumber}`,
      );
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(target);
        const reservation = await tx.get(registration);
        if (reservation.exists() && reservation.data().vehicleId !== vehicleId)
          throw new Error(
            "This registration number already exists in your garage.",
          );
        if (
          existing.exists() &&
          existing.data().currentOdometerKm !== parsed.currentOdometerKm
        )
          throw new Error("Use Add mileage to change the odometer.");
        if (
          existing.exists() &&
          existing.data().registrationNumber !== parsed.registrationNumber
        )
          tx.delete(
            doc(
              db,
              `${userRoot}/registrations/${existing.data().registrationNumber}`,
            ),
          );
        tx.set(registration, { vehicleId });
        tx.set(target, {
          ...parsed,
          ownerUid: uid,
          archived: values.archived ?? false,
          latestReadingDate: existing.data()?.latestReadingDate || today(),
          latestLogId: existing.data()?.latestLogId || "",
          createdAt: existing.data()?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      return vehicleId;
    },
    async records(vehicleId, kind, cursor) {
      const dateField = {
        serviceRecords: "serviceDate",
        expenses: "expenseDate",
        fuelLogs: "date",
        maintenanceSchedules: "updatedAt",
        documents: "expiryDate",
        odometerLogs: "recordedAt",
      }[kind];
      const constraints: QueryConstraint[] = [
        orderBy(dateField, "desc"),
        orderBy(documentId(), "desc"),
        limit(21),
      ];
      if (cursor) {
        const c = cursor as { value: unknown; id: string };
        constraints.push(startAfter(c.value, c.id));
      }
      const result = await getDocs(
        query(
          collection(db, `${vehiclePath(vehicleId)}/${kind}`),
          ...constraints,
        ),
      );
      const docs = result.docs.slice(0, 20);
      return {
        items: docs.map(
          (d) =>
            ({ ...d.data(), id: d.id, vehicleId }) as RecordMap[typeof kind],
        ),
        cursor: docs.length
          ? { value: docs.at(-1)!.data()[dateField], id: docs.at(-1)!.id }
          : null,
        hasMore: result.size > 20,
      };
    },
    async saveRecord(vehicleId, kind, data, id) {
      const recordId = id || crypto.randomUUID();
      await mutate(vehicleId, kind, data as Record<string, unknown>, recordId);
      return recordId;
    },
    async removeRecord(vehicleId, kind, id) {
      await mutate(vehicleId, kind, null, id);
    },
    async summaries(year) {
      const result = await getDocs(
        query(
          collection(db, `${userRoot}/summaries`),
          where("month", ">=", `${year}-01`),
          where("month", "<=", `${year}-12`),
          orderBy("month"),
          limit(12),
        ),
      );
      return result.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as MonthlySummary,
      );
    },
    async upload(vehicleId, file) {
      validateUpload(file);
      const extension =
        file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
      const path = `users/${uid}/vehicles/${vehicleId}/${crypto.randomUUID()}.${extension}`;
      await uploadBytes(ref(storage, path), file, { contentType: file.type });
      return path;
    },
    async fileURL(path) {
      if (!path.startsWith(`users/${uid}/vehicles/`))
        throw new Error("Invalid file path.");
      return getDownloadURL(ref(storage, path));
    },
    async removeFile(path) {
      await deleteObject(ref(storage, path));
    },
  };
}
