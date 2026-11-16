"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { EmptyState } from "./common";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { date, km, money, today } from "@/lib/formatting";
import { reminderStatus } from "@/features/reminders/calculations";
import type { AnyRecord, RecordKind, Schedule } from "@/types/domain";
import type { OdometerLog } from "@/types/domain";
import { recordedDistance } from "@/features/odometer/calculations";
export function RecordList({
  kind,
  vehicleId,
  onEdit,
  onLoaded,
}: {
  kind: RecordKind;
  vehicleId: string;
  onEdit: (record: Record<string, unknown>) => void;
  onLoaded?: (records: AnyRecord[], complete: boolean) => void;
}) {
  const { repo, version, vehicles, refresh } = useData();
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [cursor, setCursor] = useState<unknown>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deleting, setDeleting] = useState<AnyRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    async (next?: unknown) => {
      if (!vehicleId) {
        setLoading(false);
        setRecords([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const page = await repo.records(vehicleId, kind, next);
        setRecords((previous) =>
          next ? [...previous, ...page.items] : page.items,
        );
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load records.");
      } finally {
        setLoading(false);
      }
    },
    [repo, vehicleId, kind],
  );
  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load, version]);
  useEffect(() => {
    onLoaded?.(records, !hasMore && !loading);
  }, [records, hasMore, loading, onLoaded]);
  const filtered = useMemo(
    () =>
      records
        .filter((record) => {
          const r = record as unknown as Record<string, unknown>;
          const day = String(
            r.serviceDate ||
              r.expenseDate ||
              r.date ||
              r.recordedAt ||
              r.expiryDate ||
              r.nextDueDate ||
              "",
          );
          return (
            JSON.stringify(record)
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!category || r.category === category) &&
            (!from || day >= from) &&
            (!to || day <= to)
          );
        })
        .sort((a, b) => {
          const x = a as unknown as Record<string, unknown>,
            y = b as unknown as Record<string, unknown>;
          return sort === "mileage"
            ? Number(y.odometerKm ?? y.readingKm ?? 0) -
                Number(x.odometerKm ?? x.readingKm ?? 0)
            : String(
                y.serviceDate ||
                  y.expenseDate ||
                  y.date ||
                  y.recordedAt ||
                  y.expiryDate ||
                  "",
              ).localeCompare(
                String(
                  x.serviceDate ||
                    x.expenseDate ||
                    x.date ||
                    x.recordedAt ||
                    x.expiryDate ||
                    "",
                ),
              );
        }),
    [records, search, category, sort, from, to],
  );
  async function openFile(path: string) {
    setError("");
    try {
      const url = await repo.fileURL(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open file.");
    }
  }
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  return (
    <>
      {kind === "odometerLogs" && (
        <div className="notice">
          Distance recorded in loaded history:{" "}
          <strong>{km(recordedDistance(records as OdometerLog[]))} km</strong>.
          Corrections are excluded.
        </div>
      )}
      <div className="filter-bar">
        <input
          aria-label="Search records"
          placeholder="Search loaded records…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {kind === "expenses" && (
          <select
            aria-label="Expense category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {[
              "Maintenance",
              "Repairs",
              "Fuel",
              "Insurance",
              "Road tax",
              "Parking",
              "Tolls",
              "Accessories",
              "Other",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort records"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="date">Newest date</option>
          <option value="mileage">Highest mileage</option>
        </select>
        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          aria-label="To date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button className="text-button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      <div className="card">
        {loading && records.length === 0 ? (
          <div className="skeleton" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              vehicleId
                ? "A fresh page for your journey."
                : "Choose a vehicle to get started."
            }
            description={
              records.length
                ? "No loaded records match these filters. Try another search or load more records."
                : "Your records will appear here after you add one."
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{kind === "odometerLogs" ? "Reading" : "Record"}</th>
                  <th>Date</th>
                  <th>
                    {kind === "maintenanceSchedules"
                      ? "Status"
                      : kind === "documents"
                        ? "Renewal"
                        : "Mileage"}
                  </th>
                  <th>
                    {["expenses", "serviceRecords", "fuelLogs"].includes(kind)
                      ? "Amount"
                      : "Details"}
                  </th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const r = record as unknown as Record<string, unknown>;
                  const title = String(
                    r.categoryId ||
                      r.title ||
                      r.description ||
                      (kind === "fuelLogs"
                        ? `${r.litres} L · ${r.fuelType}`
                        : kind === "odometerLogs"
                          ? `${km(Number(r.readingKm))} km`
                          : "Record"),
                  );
                  const day = String(
                    r.serviceDate ||
                      r.expenseDate ||
                      r.date ||
                      r.recordedAt ||
                      r.expiryDate ||
                      r.nextDueDate ||
                      "",
                  );
                  const file = String(r.receiptPath || r.storagePath || "");
                  const linked =
                    kind === "expenses" && r.sourceType !== "manual";
                  return (
                    <tr key={record.id}>
                      <td>
                        <strong>{title}</strong>
                        <small>
                          {String(
                            (r.categoryId && r.description
                              ? `${r.description}${r.workshop ? ` · ${r.workshop}` : ""}`
                              : r.workshop) ||
                              r.provider ||
                              (linked
                                ? `Linked ${r.sourceType} expense`
                                : r.correction
                                  ? "Explicit correction"
                                  : "") ||
                              "",
                          )}
                        </small>
                      </td>
                      <td>{date(day)}</td>
                      <td>
                        {kind === "maintenanceSchedules" ? (
                          <span className="badge violet">
                            {reminderStatus(
                              record as Schedule,
                              vehicle?.currentOdometerKm || 0,
                              today(),
                            )}
                          </span>
                        ) : kind === "documents" ? (
                          money(Number(r.renewalCostSen || 0))
                        ) : (
                          `${km(Number(r.odometerKm ?? r.readingKm ?? 0))} km`
                        )}
                      </td>
                      <td>
                        {["expenses", "serviceRecords", "fuelLogs"].includes(
                          kind,
                        ) ? (
                          <strong>
                            {money(
                              Number(
                                r.amountSen ?? r.costSen ?? r.totalCostSen ?? 0,
                              ),
                            )}
                          </strong>
                        ) : (
                          <span>
                            {String(
                              r.note ||
                                r.notes ||
                                (r.nextDueKm &&
                                  `${km(Number(r.nextDueKm))} km`) ||
                                r.fileName ||
                                "—",
                            ).slice(0, 60)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {file && (
                            <button
                              aria-label={`Open attachment for ${title}`}
                              onClick={() => void openFile(file)}
                            >
                              <Download size={14} />
                            </button>
                          )}
                          {kind !== "odometerLogs" && !linked && (
                            <>
                              <button
                                aria-label={`Edit ${title}`}
                                disabled={vehicle?.archived}
                                onClick={() => onEdit(r)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                aria-label={`Delete ${title}`}
                                disabled={vehicle?.archived}
                                onClick={() => setDeleting(record)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>{records.length} loaded · filters apply to loaded records</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => void load(cursor)}
          >
            {loading ? "Loading…" : hasMore ? "Load more" : "All loaded"}
          </Button>
        </div>
      </div>
      {deleting && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setDeleting(null);
          }}
          title="Delete this record?"
          description="This cannot be undone. Linked expenses and totals will be updated together. Uploaded files are retained in Storage for recovery; remove unused attachments in the Firebase console."
        >
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep record
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await repo.removeRecord(vehicleId, kind, deleting.id);
                  await refresh();
                  setDeleting(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Delete failed.");
                  setDeleting(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete record"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
