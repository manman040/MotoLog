import type { Vehicle } from "@/types/domain";
export function validateReading(
  vehicle: Pick<Vehicle, "currentOdometerKm" | "latestReadingDate">,
  reading: number,
  recordedAt: string,
  correction: boolean,
  note: string,
) {
  if (!Number.isInteger(reading) || reading < 0 || reading > 10000000)
    throw new Error(
      "Mileage must be a whole number between 0 and 10,000,000 km.",
    );
  if (recordedAt < vehicle.latestReadingDate)
    throw new Error(
      "Use a date on or after the latest reading. Backdated changes cannot safely rewrite the history.",
    );
  if (!correction && reading < vehicle.currentOdometerKm)
    throw new Error(
      "Mileage cannot decrease. Select explicit correction and explain why.",
    );
  if (correction && note.trim().length < 10)
    throw new Error("Explain the correction in at least 10 characters.");
}
