"use client";
import { useEffect, useState } from "react";
import { useData } from "@/features/vehicles/data-provider";
import type { Expense, Schedule, VehicleDocument } from "@/types/domain";
export function useOverview() {
  const { repo, vehicles, version } = useData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [limited, setLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.all(
          vehicles
            .filter((v) => !v.archived)
            .map(async (v) => {
              const [s, d, e] = await Promise.all([
                repo.records(v.id, "maintenanceSchedules"),
                repo.records(v.id, "documents"),
                repo.records(v.id, "expenses"),
              ]);
              return { s, d, e };
            }),
        );
        if (active) {
          setSchedules(results.flatMap((r) => r.s.items));
          setDocuments(results.flatMap((r) => r.d.items));
          setRecent(
            results
              .flatMap((r) => r.e.items)
              .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
              .slice(0, 5),
          );
          setLimited(results.some((r) => r.s.hasMore || r.d.hasMore));
          setError("");
        }
      } catch {
        if (active)
          setError(
            "Some overview records could not be loaded. Refresh to retry.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [repo, vehicles, version]);
  return { schedules, documents, recent, error, limited, loading };
}
