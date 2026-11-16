"use client";
import { useCallback, useState } from "react";
import { Droplets, Fuel, Plus } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { PageHeading, Stat, VehicleSelect } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { RecordForm, type FormTarget } from "@/components/shared/record-form";
import { RecordList } from "@/components/shared/record-list";
import { fuelMetrics } from "@/features/fuel/calculations";
import { money } from "@/lib/formatting";
import type { AnyRecord, FuelLog } from "@/types/domain";
export default function FuelPage() {
  const { selectedId } = useData();
  const [target, setTarget] = useState<FormTarget | null>(null);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [complete, setComplete] = useState(false);
  const loaded = useCallback((records: AnyRecord[], all: boolean) => {
    setLogs(records as FuelLog[]);
    setComplete(all);
  }, []);
  const metrics = complete ? fuelMetrics(logs) : [];
  const latest = metrics.at(-1);
  return (
    <>
      <PageHeading
        eyebrow="EVERY FILL, ACCOUNTED FOR"
        title="Fuel tracking"
        description="Log each fill-up. Consumption needs two full tanks and a complete sequence of fills."
      >
        <VehicleSelect />
        <Button
          disabled={!selectedId}
          onClick={() => setTarget({ kind: "fuelLogs", vehicleId: selectedId })}
        >
          <Plus size={16} />
          Log fuel
        </Button>
      </PageHeading>
      <div className="stats-grid">
        <Stat
          title="Loaded fuel spending"
          value={money(logs.reduce((s, l) => s + l.totalCostSen, 0))}
          foot={`${logs.length} loaded fill-ups`}
          icon={<Fuel size={16} />}
        />
        <Stat
          title="Latest complete interval"
          value={latest ? `${latest.litresPer100Km.toFixed(1)}` : "—"}
          foot={latest ? "Litres per 100 km" : "Needs two full-tank readings"}
          icon={<Droplets size={16} />}
        />
        <Stat
          title="Fuel cost / km"
          value={latest ? money(latest.costPerKmSen) : "—"}
          foot="Based on latest full-tank interval"
          icon={<Fuel size={16} />}
        />
        <Stat
          title="Latest cost / litre"
          value={logs[0] ? money(logs[0].totalCostSen / logs[0].litres) : "—"}
          foot="Ringgit per litre"
          icon={<Droplets size={16} />}
        />
      </div>
      <p className="form-help">
        Estimates assume every fill-up in the interval was recorded. Partial
        pages are never used for consumption calculations.
      </p>
      <RecordList
        key={selectedId}
        kind="fuelLogs"
        vehicleId={selectedId}
        onLoaded={loaded}
        onEdit={(initial) =>
          setTarget({ kind: "fuelLogs", vehicleId: selectedId, initial })
        }
      />
      {target && <RecordForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
