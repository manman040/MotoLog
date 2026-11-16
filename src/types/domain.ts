export type VehicleType = "motorcycle" | "car";
export type Vehicle = {
  id: string;
  ownerUid: string;
  type: VehicleType;
  brand: string;
  model: string;
  variant: string;
  year: number;
  registrationNumber: string;
  nickname: string;
  fuelType: string;
  transmission: string;
  currentOdometerKm: number;
  purchaseDate: string;
  photoPath: string;
  archived: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  latestReadingDate: string;
  latestLogId: string;
};
export type RecordKind =
  | "serviceRecords"
  | "expenses"
  | "fuelLogs"
  | "maintenanceSchedules"
  | "documents"
  | "odometerLogs";
export type BaseRecord = {
  id: string;
  vehicleId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
export type ServiceRecord = BaseRecord & {
  categoryId: string;
  serviceDate: string;
  odometerKm: number;
  description: string;
  workshop: string;
  costSen: number;
  notes: string;
  receiptPath: string;
  nextDueKm: number | null;
  nextDueDate: string;
};
export const expenseCategories = [
  "Maintenance",
  "Repairs",
  "Fuel",
  "Insurance",
  "Road tax",
  "Parking",
  "Tolls",
  "Accessories",
  "Other",
] as const;
export type Expense = BaseRecord & {
  category: (typeof expenseCategories)[number];
  amountSen: number;
  expenseDate: string;
  description: string;
  odometerKm: number | null;
  receiptPath: string;
  sourceType: "manual" | "service" | "fuel";
  sourceRecordId: string;
};
export type FuelLog = BaseRecord & {
  date: string;
  odometerKm: number;
  litres: number;
  totalCostSen: number;
  fuelType: string;
  fullTank: boolean;
  notes: string;
};
export type Schedule = BaseRecord & {
  categoryId: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  nextDueKm: number | null;
  nextDueDate: string;
  warningKm: number;
  warningDays: number;
  active: boolean;
  completed: boolean;
};
export type VehicleDocument = BaseRecord & {
  documentType: string;
  title: string;
  provider: string;
  policyReference: string;
  expiryDate: string;
  renewalCostSen: number;
  storagePath: string;
  fileName: string;
};
export type OdometerLog = BaseRecord & {
  readingKm: number;
  recordedAt: string;
  note: string;
  correction: boolean;
  previousReadingKm: number | null;
};
export type AnyRecord =
  ServiceRecord | Expense | FuelLog | Schedule | VehicleDocument | OdometerLog;
export type RecordMap = {
  serviceRecords: ServiceRecord;
  expenses: Expense;
  fuelLogs: FuelLog;
  maintenanceSchedules: Schedule;
  documents: VehicleDocument;
  odometerLogs: OdometerLog;
};
export type MonthlySummary = {
  id: string;
  month: string;
  totalSen: number;
  categories: Record<string, number>;
  vehicles: Record<string, number>;
};
export type Page<T> = { items: T[]; cursor: unknown | null; hasMore: boolean };
