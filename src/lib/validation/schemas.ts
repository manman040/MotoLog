import { z } from "zod";
import { expenseCategories } from "@/types/domain";
import { today } from "@/lib/formatting";
const text = (max = 200) => z.string().trim().max(max);
const required = (label: string, max = 100) =>
  text(max).min(1, `${label} is required.`);
const mileage = z.number().int().min(0).max(10000000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) &&
      new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    "Choose a valid date.",
  );
const pastDate = date.refine(
  (v) => v <= today(),
  "Date cannot be in the future.",
);
const optionalDate = z.union([date, z.literal("")]);
const sen = z.number().int().min(0).max(100000000);
export const vehicleSchema = z.object({
  type: z.enum(["motorcycle", "car"]),
  brand: required("Brand", 60),
  model: required("Model", 80),
  variant: text(80),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  registrationNumber: required("Registration number", 20)
    .transform((v) => v.toUpperCase().replace(/\s/g, ""))
    .pipe(
      z
        .string()
        .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only."),
    ),
  nickname: text(80),
  fuelType: required("Fuel type", 40),
  transmission: required("Transmission", 40),
  currentOdometerKm: mileage,
  purchaseDate: z.union([pastDate, z.literal("")]),
  photoPath: text(500),
});
export const serviceSchema = z.object({
  categoryId: required("Category", 80),
  serviceDate: pastDate,
  odometerKm: mileage,
  description: required("Description", 300),
  workshop: text(120),
  costSen: sen,
  notes: text(2000),
  receiptPath: text(500),
  nextDueKm: mileage.nullable(),
  nextDueDate: optionalDate,
});
export const expenseSchema = z.object({
  category: z.enum(expenseCategories),
  amountSen: sen,
  expenseDate: pastDate,
  description: required("Description", 300),
  odometerKm: mileage.nullable(),
  receiptPath: text(500),
});
export const fuelSchema = z.object({
  date: pastDate,
  odometerKm: mileage,
  litres: z.number().positive().max(1000),
  totalCostSen: sen,
  fuelType: required("Fuel type", 40),
  fullTank: z.boolean(),
  notes: text(2000),
});
export const scheduleSchema = z
  .object({
    categoryId: required("Maintenance category", 80),
    intervalKm: z.number().int().positive().max(1000000).nullable(),
    intervalMonths: z.number().int().positive().max(240).nullable(),
    nextDueKm: mileage.nullable(),
    nextDueDate: optionalDate,
    warningKm: z.number().int().min(0).max(100000),
    warningDays: z.number().int().min(0).max(365),
    active: z.boolean(),
    completed: z.boolean(),
  })
  .refine((v) => v.nextDueKm !== null || !!v.nextDueDate, {
    message: "Set a mileage or date threshold.",
    path: ["nextDueDate"],
  });
export const documentSchema = z.object({
  documentType: z.enum([
    "Insurance",
    "Road tax",
    "Registration",
    "Warranty",
    "Other",
  ]),
  title: required("Title", 120),
  provider: text(120),
  policyReference: text(100),
  expiryDate: optionalDate,
  renewalCostSen: sen,
  storagePath: text(500),
  fileName: text(200),
});
export const odometerSchema = z.object({
  readingKm: mileage,
  recordedAt: pastDate,
  note: text(1000),
  correction: z.boolean(),
});
export function validateUpload(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Files must be 5 MB or smaller.");
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new Error("Choose a JPEG, PNG, WebP or PDF file.");
}
