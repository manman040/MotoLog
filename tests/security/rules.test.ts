import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createFirebaseRepository } from "@/lib/firebase/repository";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
let env: RulesTestEnvironment;
const path = "users/alice/vehicles/bike";
const vehicle = {
  ownerUid: "alice",
  type: "motorcycle",
  brand: "Honda",
  model: "Test",
  variant: "",
  year: 2024,
  registrationNumber: "TEST01",
  nickname: "",
  fuelType: "Petrol",
  transmission: "Manual",
  currentOdometerKm: 1000,
  purchaseDate: "",
  photoPath: "",
  archived: false,
  latestReadingDate: "2026-01-01",
  latestLogId: "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-motolog",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firebase/firestore.rules", "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync("firebase/storage.rules", "utf8"),
    },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), path), vehicle);
    await setDoc(doc(c.firestore(), "users/alice/registrations/TEST01"), {
      vehicleId: "bike",
    });
  });
});
afterAll(async () => {
  await env?.cleanup();
});
it("repository atomically updates summaries when a service moves between months and is deleted", async () => {
  const context = env.authenticatedContext("alice");
  const repo = createFirebaseRepository("alice", {
    db: context.firestore() as unknown as Firestore,
    storage: context.storage() as unknown as FirebaseStorage,
  });
  const id = await repo.saveRecord("bike", "serviceRecords", {
    categoryId: "Engine oil",
    serviceDate: "2026-01-02",
    odometerKm: 1000,
    description: "Repository test",
    workshop: "",
    costSen: 2500,
    notes: "",
    receiptPath: "",
    nextDueKm: null,
    nextDueDate: "",
  });
  let summaries = await repo.summaries(2026);
  expect(summaries.find((s) => s.month === "2026-01")?.totalSen).toBe(2500);
  const service = (await repo.records("bike", "serviceRecords")).items.find(
    (s) => s.id === id,
  )!;
  await repo.saveRecord(
    "bike",
    "serviceRecords",
    { ...service, serviceDate: "2026-02-01", costSen: 3500 },
    id,
  );
  summaries = await repo.summaries(2026);
  expect(summaries.find((s) => s.month === "2026-01")?.totalSen).toBe(0);
  expect(summaries.find((s) => s.month === "2026-02")?.totalSen).toBe(3500);
  await repo.removeRecord("bike", "serviceRecords", id);
  expect(
    (await repo.summaries(2026)).find((s) => s.month === "2026-02")?.totalSen,
  ).toBe(0);
});
it("allows owner read and rejects anonymous and cross-user reads", async () => {
  await assertSucceeds(
    getDoc(doc(env.authenticatedContext("alice").firestore(), path)),
  );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), path)),
  );
  await assertFails(
    getDoc(doc(env.authenticatedContext("bob").firestore(), path)),
  );
});
it("rejects cross-user writes and ownership changes", async () => {
  await assertFails(
    updateDoc(doc(env.authenticatedContext("bob").firestore(), path), {
      nickname: "stolen",
    }),
  );
  await assertFails(
    updateDoc(doc(env.authenticatedContext("alice").firestore(), path), {
      ownerUid: "bob",
      updatedAt: serverTimestamp(),
    }),
  );
});
it("allows atomic vehicle creation with registration reservation", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, "users/alice/vehicles/new"), {
    ...vehicle,
    registrationNumber: "NEW01",
  });
  batch.set(doc(db, "users/alice/registrations/NEW01"), { vehicleId: "new" });
  await assertSucceeds(batch.commit());
});
it("rejects negative amounts and arbitrary fields", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await assertFails(
    setDoc(doc(db, `${path}/expenses/bad`), {
      vehicleId: "bike",
      category: "Fuel",
      amountSen: -1,
      expenseDate: "2026-01-01",
      description: "Invalid",
      odometerKm: null,
      receiptPath: "",
      sourceType: "manual",
      sourceRecordId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, path), { admin: true, updatedAt: serverTimestamp() }),
  );
});
it("requires odometer history and rejects independent mileage writes", async () => {
  const db = env.authenticatedContext("alice").firestore();
  await assertFails(
    updateDoc(doc(db, path), {
      currentOdometerKm: 2000,
      updatedAt: serverTimestamp(),
    }),
  );
  const batch = writeBatch(db);
  batch.set(doc(db, `${path}/odometerLogs/log1`), {
    vehicleId: "bike",
    readingKm: 1100,
    recordedAt: "2026-01-02",
    note: "Normal reading",
    correction: false,
    previousReadingKm: 1000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, path), {
    currentOdometerKm: 1100,
    latestReadingDate: "2026-01-02",
    latestLogId: "log1",
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
});
it("allows a valid manual expense", async () => {
  await assertSucceeds(
    setDoc(
      doc(
        env.authenticatedContext("alice").firestore(),
        `${path}/expenses/manual`,
      ),
      {
        vehicleId: "bike",
        category: "Parking",
        amountSen: 500,
        expenseDate: "2026-01-01",
        description: "Parking",
        odometerKm: null,
        receiptPath: "",
        sourceType: "manual",
        sourceRecordId: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ),
  );
});
it("blocks cross-user document and expense access", async () => {
  const db = env.authenticatedContext("bob").firestore();
  await assertFails(getDoc(doc(db, `${path}/documents/doc1`)));
  await assertFails(getDoc(doc(db, `${path}/expenses/manual`)));
});
it("enforces storage ownership, MIME and size", async () => {
  const storage = env.authenticatedContext("alice").storage();
  const file = ref(storage, "users/alice/vehicles/bike/valid.pdf");
  await assertSucceeds(
    uploadBytes(file, new Uint8Array([1, 2, 3]), {
      contentType: "application/pdf",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(
        env.authenticatedContext("bob").storage(),
        "users/alice/vehicles/bike/bad.pdf",
      ),
      new Uint8Array([1]),
      { contentType: "application/pdf" },
    ),
  );
  await assertFails(
    uploadBytes(
      ref(storage, "users/alice/vehicles/bike/bad.html"),
      new Uint8Array([1]),
      { contentType: "text/html" },
    ),
  );
  await assertFails(
    uploadBytes(
      ref(storage, "users/alice/vehicles/bike/huge.pdf"),
      new Uint8Array(5 * 1024 * 1024 + 1),
      { contentType: "application/pdf" },
    ),
  );
  await assertFails(
    getBytes(
      ref(
        env.unauthenticatedContext().storage(),
        "users/alice/vehicles/bike/valid.pdf",
      ),
    ),
  );
  expect(true).toBe(true);
});
