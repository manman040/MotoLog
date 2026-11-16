import type { OdometerLog } from "@/types/domain";
/** Distance represented by normal entries; correction jumps are not travel. */
export function recordedDistance(logs: OdometerLog[]) {
  return logs.reduce(
    (sum, log) =>
      sum +
      (!log.correction && log.previousReadingKm !== null
        ? Math.max(0, log.readingKm - log.previousReadingKm)
        : 0),
    0,
  );
}
