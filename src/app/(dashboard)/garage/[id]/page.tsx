"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, Gauge, Pencil, Plus } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { PageHeading, EmptyState } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { RecordForm, type FormTarget } from "@/components/shared/record-form";
import { VehicleVisual } from "@/components/shared/vehicle-visual";
import { km, date } from "@/lib/formatting";
import { RecordList } from "@/components/shared/record-list";
import type { RecordKind } from "@/types/domain";
export default function VehicleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { vehicles, repo, refresh, select, loading } = useData();
  const vehicle = vehicles.find((v) => v.id === id);
  const [target, setTarget] = useState<FormTarget | null>(null);
  const [tab, setTab] = useState<RecordKind>("serviceRecords");
  const [error, setError] = useState("");
  if (loading) return <div className="skeleton" />;
  if (!vehicle)
    return (
      <EmptyState
        title="Vehicle not found"
        description="This vehicle may no longer be available."
      />
    );
  return (
    <>
      <Link
        className="text-button"
        style={{ paddingLeft: 0, display: "inline-flex", gap: 6, fontSize: 11 }}
        href="/garage"
      >
        <ArrowLeft size={14} />
        Back to garage
      </Link>
      <PageHeading
        eyebrow={`${vehicle.type} / ${vehicle.registrationNumber}`}
        title={`${vehicle.brand} ${vehicle.model}`}
        description={`${vehicle.nickname || "Your ride"} · ${vehicle.year} · ${vehicle.variant || vehicle.fuelType}`}
      >
        <Button
          variant="outline"
          onClick={() =>
            setTarget({ kind: "vehicle", vehicleId: id, initial: vehicle })
          }
        >
          <Pencil size={14} />
          Edit vehicle
        </Button>
        <Button
          disabled={vehicle.archived}
          onClick={() => setTarget({ kind: "odometerLogs", vehicleId: id })}
        >
          <Gauge size={15} />
          Add mileage
        </Button>
      </PageHeading>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="detail-grid">
        <VehicleVisual vehicle={vehicle} />
        <div className="card">
          <dl className="detail-fields">
            {[
              ["Current odometer", `${km(vehicle.currentOdometerKm)} km`],
              ["Registration", vehicle.registrationNumber],
              ["Fuel", vehicle.fuelType],
              ["Transmission", vehicle.transmission],
              ["Purchased", date(vehicle.purchaseDate)],
              ["Status", vehicle.archived ? "Archived" : "Active"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="card-footer">
            <Button size="sm" variant="outline" onClick={() => select(id)}>
              Set active vehicle
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (
                  !window.confirm(
                    vehicle.archived
                      ? "Restore this vehicle?"
                      : "Archive this vehicle? Its history will be retained.",
                  )
                )
                  return;
                try {
                  await repo.saveVehicle(
                    { ...vehicle, archived: !vehicle.archived },
                    id,
                  );
                  await refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Unable to archive.",
                  );
                }
              }}
            >
              <Archive size={13} />
              {vehicle.archived ? "Restore" : "Archive"}
            </Button>
          </div>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Vehicle history">
        {(
          [
            ["serviceRecords", "Services"],
            ["odometerLogs", "Mileage"],
            ["expenses", "Expenses"],
            ["fuelLogs", "Fuel"],
            ["documents", "Documents"],
          ] as [RecordKind, string][]
        ).map(([kind, label]) => (
          <button
            key={kind}
            role="tab"
            aria-selected={tab === kind}
            className={tab === kind ? "active" : ""}
            onClick={() => setTab(kind)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          size="sm"
          disabled={vehicle.archived}
          onClick={() => setTarget({ kind: tab, vehicleId: id })}
        >
          <Plus size={14} />
          Add record
        </Button>
      </div>
      <RecordList
        key={tab}
        kind={tab}
        vehicleId={id}
        onEdit={(initial) => setTarget({ kind: tab, vehicleId: id, initial })}
      />
      {target && <RecordForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
