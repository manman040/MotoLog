"use client";
import { useState } from "react";
import { Bell, Check, Pencil, Plus } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { useOverview } from "@/hooks/use-overview";
import {
  PageHeading,
  EmptyState,
  VehicleSelect,
} from "@/components/shared/common";
import { RecordForm, type FormTarget } from "@/components/shared/record-form";
import { RecordList } from "@/components/shared/record-list";
import { Button } from "@/components/ui/button";
import { reminderStatus } from "@/features/reminders/calculations";
import { date, km, today } from "@/lib/formatting";
export default function Reminders() {
  const { selectedId, vehicles, repo, refresh } = useData();
  const { schedules, documents, error, limited } = useOverview();
  const [target, setTarget] = useState<FormTarget | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  return (
    <>
      <PageHeading
        eyebrow="STAY ONE STEP AHEAD"
        title="Reminders"
        description="Your intervals, your way. Due when mileage or date reaches its threshold."
      >
        <VehicleSelect />
        <Button
          disabled={!selectedId}
          onClick={() =>
            setTarget({ kind: "maintenanceSchedules", vehicleId: selectedId })
          }
        >
          <Plus size={16} />
          Add reminder
        </Button>
      </PageHeading>
      {(error || message) && (
        <p className="notice" role="alert">
          {error || message}
        </p>
      )}
      {limited && (
        <p className="notice">
          Overview shows the first 20 reminders and documents per vehicle. Use
          the paginated records below to see more.
        </p>
      )}
      <div className="reminders-grid">
        {schedules
          .filter((s) => s.vehicleId === selectedId && s.active)
          .map((s) => {
            const v = vehicles.find((v) => v.id === s.vehicleId);
            const status = reminderStatus(
              s,
              v?.currentOdometerKm || 0,
              today(),
            );
            const remaining =
              s.nextDueKm === null
                ? null
                : s.nextDueKm - (v?.currentOdometerKm || 0);
            return (
              <article key={s.id} className="card schedule-card">
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    className={`badge ${status === "Overdue" ? "red" : status === "Due" || status === "Due soon" ? "amber" : status === "Completed" ? "green" : "violet"}`}
                  >
                    {status}
                  </span>
                  <Bell size={17} color="#a78bfa" />
                </div>
                <h2>{s.categoryId}</h2>
                <p>
                  {v?.brand} {v?.model}
                </p>
                <div className="progress-track">
                  <span
                    style={{
                      width: s.nextDueKm
                        ? `${Math.min(100, Math.max(0, ((v?.currentOdometerKm || 0) / s.nextDueKm) * 100))}%`
                        : "100%",
                    }}
                  />
                </div>
                <div className="schedule-metrics">
                  <span>
                    {remaining === null
                      ? "Date-based"
                      : remaining >= 0
                        ? `${km(remaining)} km remaining`
                        : `${km(-remaining)} km overdue`}
                  </span>
                  <span>
                    {s.nextDueDate
                      ? date(s.nextDueDate)
                      : `${km(s.nextDueKm || 0)} km`}
                  </span>
                </div>
                <div className="table-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setTarget({
                        kind: "maintenanceSchedules",
                        vehicleId: s.vehicleId,
                        initial: s,
                      })
                    }
                  >
                    <Pencil size={12} />
                    Edit
                  </Button>
                  {!s.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={async () => {
                        setBusy(s.id);
                        try {
                          await repo.saveRecord(
                            s.vehicleId,
                            "maintenanceSchedules",
                            { ...s, completed: true },
                            s.id,
                          );
                          await refresh();
                        } catch (e) {
                          setMessage(
                            e instanceof Error
                              ? e.message
                              : "Unable to complete reminder.",
                          );
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      <Check size={12} />
                      {busy === s.id ? "Saving…" : "Complete"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
      </div>
      {!schedules.some((s) => s.vehicleId === selectedId && s.active) && (
        <div className="card">
          <EmptyState
            title="A little planning. A smoother ride."
            description="Add a maintenance reminder with your own mileage or date threshold."
          />
        </div>
      )}
      <section className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h2>Document expiries</h2>
        </div>
        {documents.filter((d) => d.vehicleId === selectedId && d.expiryDate)
          .length ? (
          <div className="reminder-list">
            {documents
              .filter((d) => d.vehicleId === selectedId && d.expiryDate)
              .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
              .map((d) => (
                <div key={d.id} className="reminder-item">
                  <span className="item-icon amber">
                    <Bell size={16} />
                  </span>
                  <div className="item-content">
                    <strong>{d.title}</strong>
                    <p>
                      {d.documentType} · expires {date(d.expiryDate)}
                    </p>
                  </div>
                  <span
                    className={`badge ${d.expiryDate < today() ? "red" : "violet"}`}
                  >
                    {d.expiryDate < today() ? "Expired" : "Upcoming"}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="No expiry dates yet"
            description="Add insurance and road tax dates under Documents."
          />
        )}
      </section>
      <h2 style={{ marginTop: 30 }}>All reminders for selected vehicle</h2>
      <RecordList
        kind="maintenanceSchedules"
        vehicleId={selectedId}
        onEdit={(initial) =>
          setTarget({
            kind: "maintenanceSchedules",
            vehicleId: selectedId,
            initial,
          })
        }
      />
      {target && <RecordForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
