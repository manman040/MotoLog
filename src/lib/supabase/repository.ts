"use client";
import { supabaseBrowser } from "./browser";
import { z } from "zod";
import type { Repository } from "@/lib/firebase/repository";
import type {
  RecordKind,
  RecordMap,
  Vehicle,
  MonthlySummary,
} from "@/types/domain";
import {
  vehicleSchema,
  serviceSchema,
  expenseSchema,
  fuelSchema,
  scheduleSchema,
  documentSchema,
  odometerSchema,
  validateUpload,
} from "@/lib/validation/schemas";
const tables = {
  serviceRecords: "maintenance_records",
  expenses: "expenses",
  fuelLogs: "fuel_logs",
  maintenanceSchedules: "maintenance_schedules",
  documents: "vehicle_documents",
  odometerLogs: "odometer_logs",
} as const;
const schemas = {
  serviceRecords: serviceSchema,
  expenses: expenseSchema,
  fuelLogs: fuelSchema,
  maintenanceSchedules: scheduleSchema,
  documents: documentSchema,
  odometerLogs: odometerSchema,
};
type Row = {
  id: string;
  owner_id: string;
  vehicle_id?: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  source_type?: string;
  source_record_id?: string | null;
};
function checked(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (["42P01", "PGRST205", "42883", "PGRST202"].includes(error.code || ""))
    throw new Error(
      "Supabase database setup is pending. Review and approve the SQL migrations before using account records. Demo mode remains available.",
    );
  if (error.code === "23505")
    throw new Error("This registration or record already exists.");
  if (error.code === "42501")
    throw new Error(
      "You do not have permission to change this record. Please sign in again.",
    );
  throw new Error(error.message || "Supabase request failed. Please retry.");
}
function record<K extends RecordKind>(row: Row, kind: K): RecordMap[K] {
  return {
    ...row.data,
    id: row.id,
    vehicleId: row.vehicle_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(kind === "expenses"
      ? {
          sourceType: row.source_type,
          sourceRecordId: row.source_record_id || "",
        }
      : {}),
  } as RecordMap[K];
}
function storagePath(value: string) {
  const match =
    /^(vehicle-photos|service-receipts|vehicle-documents)\/(.+)$/.exec(value);
  if (!match) throw new Error("Invalid private attachment path.");
  return { bucket: match[1], path: match[2] };
}
export function createSupabaseRepository(uid: string): Repository {
  const client = supabaseBrowser();
  return {
    async vehicles() {
      const { data, error } = await client
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      checked(error);
      return ((data as Row[]) || []).map(
        (row) =>
          ({
            ...row.data,
            id: row.id,
            ownerUid: row.owner_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }) as Vehicle,
      );
    },
    async saveVehicle(values, id) {
      const parsed = vehicleSchema.parse(values);
      const vehicleId = id || crypto.randomUUID();
      const { error } = await client.from("vehicles").upsert({
        id: vehicleId,
        owner_id: uid,
        data: { ...parsed, archived: values.archived ?? false },
      });
      checked(error);
      return vehicleId;
    },
    async records<K extends RecordKind>(
      vehicleId: string,
      kind: K,
      cursor?: unknown,
    ) {
      let query = client
        .from(tables[kind])
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(21);
      if (cursor) {
        const parsed = z
          .object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() })
          .parse(cursor);
        query = query.or(
          `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
        );
      }
      const { data, error } = await query;
      checked(error);
      const rows = (data || []) as Row[];
      const page = rows.slice(0, 20);
      return {
        items: page.map((r) => record(r, kind)),
        cursor: page.length
          ? { createdAt: page.at(-1)!.created_at, id: page.at(-1)!.id }
          : null,
        hasMore: rows.length > 20,
      };
    },
    async saveRecord(vehicleId, kind, input, id) {
      if (kind === "odometerLogs" && id)
        throw new Error(
          "Odometer history is immutable. Add an explicit correction.",
        );
      const parsed = schemas[kind].parse(input);
      const recordId = id || crypto.randomUUID();
      const row = {
        id: recordId,
        owner_id: uid,
        vehicle_id: vehicleId,
        data: parsed,
      };
      const result =
        kind === "odometerLogs"
          ? await client.from(tables[kind]).insert(row)
          : await client.from(tables[kind]).upsert(row);
      checked(result.error);
      return recordId;
    },
    async removeRecord(vehicleId, kind, id) {
      if (kind === "odometerLogs")
        throw new Error(
          "Add an explicit correction to preserve mileage history.",
        );
      const { error } = await client
        .from(tables[kind])
        .delete()
        .eq("id", id)
        .eq("vehicle_id", vehicleId);
      checked(error);
    },
    async summaries(year) {
      const { data, error } = await client.rpc("motolog_expense_summaries", {
        p_year: year,
      });
      checked(error);
      return (data || []) as MonthlySummary[];
    },
    async upload(vehicleId, file, purpose = "receipt") {
      validateUpload(file);
      if (purpose === "photo" && !file.type.startsWith("image/"))
        throw new Error("Vehicle photos must be images.");
      const bucket =
        purpose === "photo"
          ? "vehicle-photos"
          : purpose === "document"
            ? "vehicle-documents"
            : "service-receipts";
      const path = `${uid}/${vehicleId}/${crypto.randomUUID()}.${file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]}`;
      const { error } = await client.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });
      checked(error);
      return `${bucket}/${path}`;
    },
    async fileURL(value) {
      const { bucket, path } = storagePath(value);
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(path, 60);
      checked(error);
      if (!data?.signedUrl)
        throw new Error("Unable to create a private download link.");
      return data.signedUrl;
    },
    async removeFile(value) {
      const { bucket, path } = storagePath(value);
      const { error } = await client.storage.from(bucket).remove([path]);
      checked(error);
    },
  };
}
