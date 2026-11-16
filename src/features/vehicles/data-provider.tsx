"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/provider";
import {
  createFirebaseRepository,
  type Repository,
} from "@/lib/firebase/repository";
import { demoRepository } from "@/lib/demo/repository";
import type { Vehicle } from "@/types/domain";
import { createSupabaseRepository } from "@/lib/supabase/repository";
type Data = {
  repo: Repository;
  vehicles: Vehicle[];
  selectedId: string;
  select: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string;
  version: number;
};
const Context = createContext<Data | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const { demo, user } = useAuth();
  const repo = useMemo(
    () =>
      demo
        ? demoRepository
        : user
          ? user.backend === "supabase"
            ? createSupabaseRepository(user.uid)
            : createFirebaseRepository(user.uid)
          : null,
    [demo, user],
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, select] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const selectionKey = `motolog-active-${demo ? "demo" : user?.uid || "none"}`;
  const refresh = useCallback(async () => {
    if (!repo) return;
    setError("");
    try {
      const result = await repo.vehicles();
      setVehicles(result);
      select((previous) => {
        const candidate = previous || localStorage.getItem(selectionKey) || "";
        return result.some((v) => v.id === candidate && !v.archived)
          ? candidate
          : result.find((v) => !v.archived)?.id || "";
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your garage.");
    } finally {
      setLoading(false);
    }
  }, [repo, selectionKey]);
  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);
  if (!repo) return null;
  return (
    <Context.Provider
      value={{
        repo,
        vehicles,
        selectedId,
        select: (id) => {
          localStorage.setItem(selectionKey, id);
          select(id);
        },
        refresh,
        loading,
        error,
        version,
      }}
    >
      {error && (
        <div className="notice" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error("DataProvider missing");
  return value;
}
