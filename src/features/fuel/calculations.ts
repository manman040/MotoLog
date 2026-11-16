import type { FuelLog } from "@/types/domain";
export function fuelMetrics(logs: FuelLog[]) {
  const ordered = [...logs].sort(
    (a, b) => a.date.localeCompare(b.date) || a.odometerKm - b.odometerKm,
  );
  let anchor: FuelLog | undefined;
  let previousKm: number | undefined;
  let litres = 0,
    cost = 0;
  const intervals: {
    distanceKm: number;
    litresPer100Km: number;
    costPerKmSen: number;
  }[] = [];
  for (const log of ordered) {
    if (
      !Number.isFinite(log.odometerKm) ||
      !Number.isFinite(log.litres) ||
      log.litres <= 0 ||
      log.totalCostSen < 0
    )
      return [];
    if (previousKm !== undefined && log.odometerKm <= previousKm) {
      anchor = undefined;
      litres = 0;
      cost = 0;
    }
    previousKm = log.odometerKm;
    if (anchor) {
      litres += log.litres;
      cost += log.totalCostSen;
      if (log.fullTank) {
        const distance = log.odometerKm - anchor.odometerKm;
        if (distance > 0 && log.date >= anchor.date)
          intervals.push({
            distanceKm: distance,
            litresPer100Km: (litres / distance) * 100,
            costPerKmSen: cost / distance,
          });
        anchor = log;
        litres = 0;
        cost = 0;
      }
    } else if (log.fullTank) anchor = log;
  }
  return intervals;
}
