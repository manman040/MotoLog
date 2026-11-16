"use client";
import { useEffect, useState } from "react";
import { useData } from "@/features/vehicles/data-provider";
import type { MonthlySummary } from "@/types/domain";
export function useSummaries(year: number) {
  const { repo, version } = useData();
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return repo.summaries(year);
      })
      .then((data) => {
        if (active) {
          setSummaries(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load expense summaries. Please refresh to retry.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo, version, year]);
  return { summaries, error, loading };
}
