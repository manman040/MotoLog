"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useData } from "@/features/vehicles/data-provider";
import { useAuth } from "@/features/auth/provider";
import { toSen, today } from "@/lib/formatting";
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
import {
  expenseCategories,
  type RecordKind,
  type Vehicle,
} from "@/types/domain";
type Field = {
  name: string;
  label: string;
  type?: string;
  options?: readonly string[];
  required?: boolean;
  full?: boolean;
  help?: string;
};
const categories = [
  "Engine oil",
  "Oil filter",
  "Brake pads",
  "Brake fluid",
  "Tyres",
  "Battery",
  "Coolant",
  "Air filter",
  "Chain and sprocket",
  "CVT belt",
  "Roller weights",
  "Clutch components",
  "Transmission fluid",
  "Spark plugs",
  "Cabin filter",
  "Air conditioning",
  "Timing belt",
];
const fields: Record<RecordKind | "vehicle", Field[]> = {
  vehicle: [
    { name: "type", label: "Vehicle type", options: ["motorcycle", "car"] },
    { name: "nickname", label: "Nickname" },
    { name: "brand", label: "Brand", required: true },
    { name: "model", label: "Model", required: true },
    { name: "variant", label: "Variant" },
    {
      name: "year",
      label: "Manufacturing year",
      type: "number",
      required: true,
    },
    {
      name: "registrationNumber",
      label: "Registration number",
      required: true,
    },
    {
      name: "currentOdometerKm",
      label: "Current odometer (km)",
      type: "number",
      required: true,
    },
    {
      name: "fuelType",
      label: "Fuel type",
      options: ["Petrol", "Diesel", "Electric", "Hybrid", "Other"],
    },
    {
      name: "transmission",
      label: "Transmission",
      options: ["Manual", "Automatic", "CVT", "DCT", "Other"],
    },
    { name: "purchaseDate", label: "Purchase date", type: "date" },
    {
      name: "photoPath",
      label: "Vehicle photo",
      type: "file",
      help: "JPEG, PNG or WebP · maximum 5 MB",
    },
  ],
  serviceRecords: [
    {
      name: "categoryId",
      label: "Maintenance category",
      required: true,
      help: "Choose a suggestion or type your own category.",
    },
    {
      name: "serviceDate",
      label: "Service date",
      type: "date",
      required: true,
    },
    {
      name: "odometerKm",
      label: "Odometer (km)",
      type: "number",
      required: true,
    },
    { name: "costSen", label: "Cost (RM)", type: "money", required: true },
    { name: "description", label: "Description", required: true, full: true },
    { name: "workshop", label: "Workshop", full: true },
    {
      name: "nextDueKm",
      label: "Next service mileage (km)",
      type: "nullable-number",
    },
    { name: "nextDueDate", label: "Next service date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", full: true },
    { name: "receiptPath", label: "Receipt", type: "file", full: true },
  ],
  expenses: [
    { name: "category", label: "Category", options: expenseCategories },
    { name: "amountSen", label: "Amount (RM)", type: "money", required: true },
    { name: "expenseDate", label: "Date", type: "date", required: true },
    {
      name: "odometerKm",
      label: "Odometer (km), optional",
      type: "nullable-number",
    },
    { name: "description", label: "Description", required: true, full: true },
    { name: "receiptPath", label: "Receipt", type: "file", full: true },
  ],
  fuelLogs: [
    { name: "date", label: "Date", type: "date", required: true },
    {
      name: "odometerKm",
      label: "Odometer (km)",
      type: "number",
      required: true,
    },
    { name: "litres", label: "Litres", type: "decimal", required: true },
    {
      name: "totalCostSen",
      label: "Total cost (RM)",
      type: "money",
      required: true,
    },
    {
      name: "fuelType",
      label: "Fuel type",
      options: ["RON 95", "RON 97", "Diesel", "Other"],
    },
    { name: "fullTank", label: "Filled to a full tank", type: "checkbox" },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ],
  maintenanceSchedules: [
    {
      name: "categoryId",
      label: "Maintenance category",
      required: true,
      full: true,
    },
    {
      name: "nextDueKm",
      label: "Next due mileage (km)",
      type: "nullable-number",
    },
    { name: "nextDueDate", label: "Next due date", type: "date" },
    {
      name: "intervalKm",
      label: "Interval (km), optional",
      type: "nullable-number",
    },
    {
      name: "intervalMonths",
      label: "Interval (months), optional",
      type: "nullable-number",
    },
    {
      name: "warningKm",
      label: "Warn within (km)",
      type: "number",
      required: true,
    },
    {
      name: "warningDays",
      label: "Warn within (days)",
      type: "number",
      required: true,
    },
    { name: "active", label: "Active reminder", type: "checkbox" },
    { name: "completed", label: "Completed", type: "checkbox" },
  ],
  documents: [
    {
      name: "documentType",
      label: "Document type",
      options: ["Insurance", "Road tax", "Registration", "Warranty", "Other"],
    },
    { name: "title", label: "Document title", required: true },
    { name: "provider", label: "Insurance provider / issuer" },
    { name: "policyReference", label: "Policy reference (optional)" },
    { name: "expiryDate", label: "Expiry date", type: "date" },
    { name: "renewalCostSen", label: "Renewal cost (RM)", type: "money" },
    {
      name: "storagePath",
      label: "Document file",
      type: "file",
      full: true,
      help: "JPEG, PNG, WebP or PDF · maximum 5 MB. Avoid identity documents.",
    },
  ],
  odometerLogs: [
    {
      name: "readingKm",
      label: "Odometer reading (km)",
      type: "number",
      required: true,
    },
    { name: "recordedAt", label: "Reading date", type: "date", required: true },
    {
      name: "correction",
      label: "This is an explicit correction",
      type: "checkbox",
      full: true,
    },
    {
      name: "note",
      label: "Note / reason for correction",
      type: "textarea",
      full: true,
      help: "Corrections require a reason (10+ characters) and retain the previous reading. Backdated edits are not supported.",
    },
  ],
};
const inputSchema = z.record(z.string(), z.union([z.string(), z.boolean()]));
type Values = z.infer<typeof inputSchema>;
export type FormTarget = {
  kind: RecordKind | "vehicle";
  vehicleId?: string;
  initial?: Record<string, unknown>;
};
export function RecordForm({
  target,
  onClose,
  onSaved,
}: {
  target: FormTarget;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { repo, vehicles, selectedId, refresh, select } = useData();
  const { demo } = useAuth();
  const vehicle = vehicles.find(
    (v) => v.id === (target.vehicleId || selectedId),
  );
  const [file, setFile] = useState<File | null>(null);
  const [savedVehicleId, setSavedVehicleId] = useState<string | undefined>(
    target.kind === "vehicle"
      ? (target.initial?.id as string | undefined)
      : undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = target.initial || {};
  const defaults: Values = {};
  for (const f of fields[target.kind]) {
    const value = initial[f.name];
    defaults[f.name] =
      value !== undefined && value !== null
        ? f.type === "money"
          ? (Number(value) / 100).toFixed(2)
          : f.type === "checkbox"
            ? Boolean(value)
            : String(value)
        : f.type === "checkbox"
          ? f.name === "active"
          : f.type === "money"
            ? "0.00"
            : f.type === "date"
              ? ["serviceDate", "expenseDate", "recordedAt", "date"].includes(
                  f.name,
                )
                ? today()
                : ""
              : f.options
                ? f.options[0]
                : "";
  }
  if (!initial.id) {
    Object.assign(
      defaults,
      target.kind === "vehicle"
        ? { year: String(new Date().getFullYear()), currentOdometerKm: "0" }
        : target.kind === "odometerLogs"
          ? { readingKm: String(vehicle?.currentOdometerKm || 0) }
          : ["serviceRecords", "fuelLogs"].includes(target.kind)
            ? { odometerKm: String(vehicle?.currentOdometerKm || 0) }
            : target.kind === "maintenanceSchedules"
              ? { warningKm: "500", warningDays: "14" }
              : {},
    );
  }
  const {
    register,
    handleSubmit,
    setError: formError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(inputSchema),
    defaultValues: defaults,
  });
  async function submit(values: Values) {
    setBusy(true);
    setError("");
    let uploaded = "";
    let currentVehicleId = savedVehicleId;
    let attachingNewVehiclePhoto = false;
    try {
      const data: Record<string, unknown> = {};
      for (const f of fields[target.kind]) {
        const value = values[f.name];
        data[f.name] =
          f.type === "money"
            ? toSen(String(value || "0"))
            : f.type === "nullable-number"
              ? value === ""
                ? null
                : Number(value)
              : ["number", "decimal"].includes(f.type || "")
                ? Number(value)
                : f.type === "checkbox"
                  ? Boolean(value)
                  : String(value ?? "");
      }
      if (target.kind === "documents")
        data.fileName = String(initial.fileName || "");
      for (const field of fields[target.kind].filter((f) => f.type === "file"))
        data[field.name] = String(initial[field.name] || "");
      const schema = {
        vehicle: vehicleSchema,
        serviceRecords: serviceSchema,
        expenses: expenseSchema,
        fuelLogs: fuelSchema,
        maintenanceSchedules: scheduleSchema,
        documents: documentSchema,
        odometerLogs: odometerSchema,
      }[target.kind];
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          formError(String(issue.path[0]), { message: issue.message });
        throw new Error("Check the highlighted fields.");
      }
      if (file) {
        validateUpload(file);
        if (target.kind === "vehicle" && !file.type.startsWith("image/"))
          throw new Error("Vehicle photos must be images.");
        let uploadVehicleId = vehicle?.id;
        if (target.kind === "vehicle") {
          uploadVehicleId = savedVehicleId;
          if (!uploadVehicleId) {
            uploadVehicleId = await repo.saveVehicle({
              ...data,
              archived: false,
            } as Partial<Vehicle>);
            setSavedVehicleId(String(uploadVehicleId));
            select(uploadVehicleId);
          }
          attachingNewVehiclePhoto = !initial.id;
          currentVehicleId = uploadVehicleId;
        }
        if (!uploadVehicleId)
          throw new Error("Add a vehicle before attaching a file.");
        uploaded = await repo.upload(
          uploadVehicleId,
          file,
          target.kind === "vehicle"
            ? "photo"
            : target.kind === "documents"
              ? "document"
              : "receipt",
        );
        const f = fields[target.kind].find((f) => f.type === "file");
        if (f) data[f.name] = uploaded;
        if (target.kind === "documents") data.fileName = file.name;
      }
      if (target.kind === "documents" && !file)
        data.fileName = String(initial.fileName || "");
      if (target.kind === "vehicle") {
        const id = await repo.saveVehicle(
          { ...data, archived: initial.archived ?? false } as Partial<Vehicle>,
          currentVehicleId,
        );
        select(id);
        setSavedVehicleId(String(id));
      } else {
        if (!vehicle)
          throw new Error("Add a vehicle before creating a record.");
        if (target.kind === "odometerLogs") data.previousReadingKm = null;
        await repo.saveRecord(
          vehicle.id,
          target.kind,
          data as never,
          initial.id as string | undefined,
        );
      }
      // The file now belongs to a committed record; refresh failures must not delete it.
      uploaded = "";
      attachingNewVehiclePhoto = false;
      await refresh();
      onSaved?.();
      onClose();
    } catch (e) {
      let cleanupFailed = false;
      if (uploaded)
        await repo.removeFile(uploaded).catch(() => {
          cleanupFailed = true;
        });
      setError(
        `${attachingNewVehiclePhoto ? "Your vehicle was saved, but the photo could not be attached. Retry to attach it to the same vehicle. " : ""}${e instanceof Error ? e.message : "Unable to save. Please try again."}${cleanupFailed ? " Attachment cleanup also failed. Remove the unused file from storage." : ""}`,
      );
      if (attachingNewVehiclePhoto) await refresh();
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    vehicle: "vehicle",
    serviceRecords: "service record",
    expenses: "expense",
    fuelLogs: "fuel log",
    maintenanceSchedules: "reminder",
    documents: "document",
    odometerLogs: "mileage reading",
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={`${initial.id ? "Edit" : "Add"} ${titles[target.kind]}`}
      description={
        target.kind === "maintenanceSchedules"
          ? "Set your own thresholds using your owner’s manual or workshop advice. Either threshold makes a reminder due."
          : target.kind === "vehicle"
            ? "Make a little room in your garage. Motorcycles and cars are welcome."
            : `For ${vehicle ? `${vehicle.brand} ${vehicle.model}` : "your garage"} · ${demo ? "browser-local demo" : "saved to your account"}`
      }
    >
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div className="form-grid">
          {fields[target.kind].map((f) => (
            <div key={f.name} className={f.full ? "full" : ""}>
              <label className={f.type === "checkbox" ? "check-label" : ""}>
                {f.label}
                {f.required && " *"}
                {f.type === "file" ? (
                  <input
                    type="file"
                    accept={
                      target.kind === "vehicle"
                        ? "image/jpeg,image/png,image/webp"
                        : "image/jpeg,image/png,image/webp,application/pdf"
                    }
                    disabled={demo || busy}
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setError("");
                      setFile(null);
                      if (selected) {
                        try {
                          validateUpload(selected);
                          if (
                            target.kind === "vehicle" &&
                            !selected.type.startsWith("image/")
                          )
                            throw new Error("Vehicle photos must be images.");
                          setFile(selected);
                        } catch (error) {
                          e.target.value = "";
                          setError(
                            error instanceof Error
                              ? error.message
                              : "Invalid file.",
                          );
                        }
                      }
                    }}
                  />
                ) : f.options ? (
                  <select {...register(f.name)}>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea {...register(f.name)} maxLength={2000} />
                ) : (
                  <input
                    {...register(f.name)}
                    type={
                      f.type === "checkbox"
                        ? "checkbox"
                        : f.type === "date"
                          ? "date"
                          : [
                                "money",
                                "number",
                                "decimal",
                                "nullable-number",
                              ].includes(f.type || "")
                            ? "number"
                            : "text"
                    }
                    step={
                      ["money", "decimal"].includes(f.type || "") ? "0.01" : "1"
                    }
                    min={
                      [
                        "money",
                        "number",
                        "decimal",
                        "nullable-number",
                      ].includes(f.type || "")
                        ? "0"
                        : undefined
                    }
                    inputMode={
                      ["money", "decimal"].includes(f.type || "")
                        ? "decimal"
                        : ["number", "nullable-number"].includes(f.type || "")
                          ? "numeric"
                          : undefined
                    }
                    maxLength={300}
                    list={
                      f.name === "categoryId"
                        ? "maintenance-categories"
                        : undefined
                    }
                    disabled={
                      target.kind === "vehicle" &&
                      !!savedVehicleId &&
                      f.name === "currentOdometerKm"
                    }
                    aria-invalid={Boolean(errors[f.name])}
                    aria-describedby={
                      errors[f.name] ? `error-${f.name}` : undefined
                    }
                  />
                )}
                {errors[f.name] && (
                  <span id={`error-${f.name}`} className="field-error">
                    {errors[f.name]?.message}
                  </span>
                )}
              </label>
              {f.help && <p className="form-help">{f.help}</p>}
              {f.type === "file" && demo && (
                <p className="form-help">
                  File uploads are available when signed into a connected
                  account.
                </p>
              )}
            </div>
          ))}
        </div>
        <datalist id="maintenance-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
