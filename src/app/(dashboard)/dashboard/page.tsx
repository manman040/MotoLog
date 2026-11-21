"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Fuel,
  Gauge,
  LayoutGrid,
  Plus,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/features/auth/provider";
import { useData } from "@/features/vehicles/data-provider";
import { VehicleVisual } from "@/components/shared/vehicle-visual";
import { useOverview } from "@/hooks/use-overview";
import { useSummaries } from "@/hooks/use-summaries";
import {
  PageHeading,
  Stat,
  EmptyState,
  VehicleSelect,
} from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { RecordForm, type FormTarget } from "@/components/shared/record-form";
import { ExpenseChart } from "@/components/shared/charts";
import { reminderStatus } from "@/features/reminders/calculations";
import { date, km, money, today } from "@/lib/formatting";
function WelcomeCard({
  storageKey,
  name,
  onAdd,
}: {
  storageKey: string;
  name?: string | null;
  onAdd: () => void;
}) {
  const [skipped, setSkipped] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  if (skipped) return null;

  function skip() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Dismiss for this visit if browser storage is unavailable.
    }
    setSkipped(true);
  }

  return (
    <section className="card onboarding-card" aria-labelledby="welcome-title">
      <Gauge size={32} aria-hidden="true" />
      <h2 id="welcome-title">Welcome to MotoLog{name ? `, ${name}` : ""}</h2>
      <p>
        Add your first vehicle to track its mileage, maintenance, fuel and
        expenses in one place.
      </p>
      <div className="heading-actions">
        <Button onClick={onAdd}>Add My First Vehicle</Button>
        <Button variant="outline" onClick={skip}>Skip for Now</Button>
      </div>
    </section>
  );
}
export default function Dashboard() {
  const { user, demo } = useAuth();
  const { vehicles, selectedId, loading, error: garageError } = useData();
  const {
    schedules, recent, error, limited, loading: overviewLoading,
  } = useOverview();
  const current = today();
  const year = Number(current.slice(0, 4));
  const { summaries, error: summaryError, loading: summariesLoading } =
    useSummaries(year);
  const [target, setTarget] = useState<FormTarget | null>(null);
  const [vehicleAdded, setVehicleAdded] = useState(false);
  const reduced = useReducedMotion();
  const onboardingKey = user
    ? `motolog-onboarding-${user.backend}-${user.uid}`
    : "";
  const vehicle = vehicles.find((v) => v.id === selectedId);
  const activeCount = vehicles.filter((v) => !v.archived).length;
  const remindersUnavailable = Boolean(error || garageError);
  const reminders = schedules
    .filter((s) => s.active && !s.completed)
    .map((s) => ({
      ...s,
      status: reminderStatus(
        s,
        vehicles.find((v) => v.id === s.vehicleId)?.currentOdometerKm || 0,
        current,
      ),
    }))
    .sort(
      (a, b) =>
        ["Overdue", "Due", "Due soon", "Upcoming"].indexOf(a.status) -
        ["Overdue", "Due", "Due soon", "Upcoming"].indexOf(b.status),
    );
  const month =
    summaries.find((s) => s.month === current.slice(0, 7))?.totalSen || 0;
  const annual = summaries.reduce((s, m) => s + m.totalSen, 0);
  const overdue = reminders.filter((s) => s.status === "Overdue").length;
  const monthNumber = Number(current.slice(5, 7));
  const chartData = Array.from({ length: Math.min(6, monthNumber) }, (_, i) => {
    const m = monthNumber - Math.min(6, monthNumber) + i + 1;
    return {
      name: new Date(year, m - 1, 1).toLocaleDateString("en-MY", {
        month: "short",
      }),
      value:
        summaries.find(
          (s) => s.month === `${year}-${String(m).padStart(2, "0")}`,
        )?.totalSen || 0,
    };
  });
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="dashboard-heading">
        <PageHeading
          eyebrow="Dashboard"
          title={`Welcome back${demo ? "" : user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.`}
          description="Manage your vehicles and see your latest activity."
        >
          <Button
            variant="outline"
            disabled={!vehicle}
            onClick={() => setTarget({ kind: "expenses", vehicleId: selectedId })}
          >
            <Plus size={15} />
            Add expense
          </Button>
          <Button onClick={() => setTarget({ kind: "vehicle" })}>
            <Plus size={15} />
            Add vehicle
          </Button>
        </PageHeading>
      </div>
      {vehicleAdded && (
        <p className="notice" role="status">Vehicle added to your garage.</p>
      )}
      {!demo && onboardingKey && !loading && !garageError && vehicles.length === 0 && (
        <WelcomeCard
          key={onboardingKey}
          storageKey={onboardingKey}
          name={user?.displayName}
          onAdd={() => setTarget({ kind: "vehicle" })}
        />
      )}
      {(error || summaryError) && (
        <div className="notice" role="alert">
          {error || summaryError}
        </div>
      )}
      {limited && (
        <p className="notice">
          Reminder overview is limited to 20 records per vehicle. Open Reminders
          to load more.
        </p>
      )}
      {loading || overviewLoading || summariesLoading ? (
        <div className="skeleton" />
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              title="Registered vehicles"
              value={garageError ? "Unavailable" : (
                <>
                  {vehicles.length}
                  <small>vehicles</small>
                </>
              )}
              foot={garageError ? "Garage could not be loaded" : `${activeCount} active`}
              icon={<LayoutGrid size={16} />}
            />
            <Stat
              title="This month’s expenses"
              value={summaryError ? "Unavailable" : money(month)}
              foot={
                <>
                  <span className="green">●</span> All vehicles ·{" "}
                  {new Date(`${current}T12:00:00`).toLocaleDateString("en-MY", {
                    month: "long",
                  })}
                </>
              }
              icon={<Wallet size={16} />}
            />
            <Stat
              title="Upcoming services"
              value={
                <>
                  {remindersUnavailable ? "—" : reminders.length}
                  <small>reminders</small>
                </>
              }
              foot={
                remindersUnavailable ? "Reminders unavailable" : overdue ? (
                  <span className="amber">
                    {overdue} overdue · a little attention needed
                  </span>
                ) : (
                  <span className="green">You’re keeping things on track</span>
                )
              }
              icon={<Bell size={16} />}
            />
            <Stat
              title="Annual expenses"
              value={summaryError ? "Unavailable" : money(annual)}
              foot={`${year} year to date · all vehicles`}
              icon={<CircleDollarSign size={16} />}
            />
          </div>
          <div className="dashboard-grid">
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Your active vehicle</h2>
                  <p>My Garage preview</p>
                </div>
                <VehicleSelect />
              </div>
              {vehicle ? (
                <div className="vehicle-feature">
                  <VehicleVisual vehicle={vehicle} />
                  <div className="vehicle-title">
                    <div>
                      <h3>
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p>
                        {vehicle.variant ? `${vehicle.variant} · ` : ""}
                        {vehicle.year}{" "}
                        <span style={{ padding: "0 6px" }}>·</span>
                        {vehicle.registrationNumber}
                      </p>
                    </div>
                    <span className="badge green">
                      <Check size={9} />
                      Active
                    </span>
                  </div>
                  <div className="vehicle-facts">
                    <div>
                      <span>CURRENT ODOMETER</span>
                      <strong>
                        {km(vehicle.currentOdometerKm)}{" "}
                        <span style={{ display: "inline", fontSize: 9 }}>
                          km
                        </span>
                      </strong>
                    </div>
                    <div>
                      <span>FUEL TYPE</span>
                      <strong>{vehicle.fuelType}</strong>
                    </div>
                    <div>
                      <span>TRANSMISSION</span>
                      <strong>{vehicle.transmission}</strong>
                    </div>
                  </div>
                  <div className="vehicle-actions">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setTarget({
                          kind: "odometerLogs",
                          vehicleId: selectedId,
                        })
                      }
                    >
                      <Gauge size={14} />
                      Update mileage
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/garage/${selectedId}`}>
                        Vehicle details
                        <ArrowRight size={13} />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Every journey starts somewhere."
                  description="Add your first vehicle to make this garage yours."
                  action="Add a vehicle"
                  onAction={() => setTarget({ kind: "vehicle" })}
                />
              )}
            </section>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>On the horizon</h2>
                  <p>A heads-up for a healthier garage.</p>
                </div>
                <Link href="/reminders">
                  View all
                  <ArrowRight size={12} />
                </Link>
              </div>
              {reminders.length ? (
                <div className="reminder-list">
                  {reminders.slice(0, 4).map((s) => {
                    const v = vehicles.find((v) => v.id === s.vehicleId);
                    const remaining =
                      s.nextDueKm === null
                        ? null
                        : s.nextDueKm - (v?.currentOdometerKm || 0);
                    return (
                      <Link
                        href="/reminders"
                        className="reminder-item"
                        key={s.id}
                      >
                        <span
                          className={`item-icon ${s.status === "Overdue" ? "red" : s.status === "Due soon" || s.status === "Due" ? "amber" : ""}`}
                        >
                          <Wrench size={16} />
                        </span>
                        <div className="item-content">
                          <strong>{s.categoryId}</strong>
                          <p>
                            {v?.brand} {v?.model}
                          </p>
                        </div>
                        <div className="reminder-end">
                          <span
                            className={`badge ${s.status === "Overdue" ? "red" : s.status === "Due soon" || s.status === "Due" ? "amber" : "violet"}`}
                          >
                            {s.status}
                          </span>
                          <small>
                            {remaining === null
                              ? date(s.nextDueDate)
                              : remaining < 0
                                ? `${km(-remaining)} km overdue`
                                : `in ${km(remaining)} km`}
                          </small>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Nothing on the horizon yet"
                  description="Set custom service thresholds for your vehicle."
                />
              )}
              <div className="card-footer">
                <ShieldCheck size={12} />A timely service goes a long way.
              </div>
              <div className="card-header" style={{ paddingBottom: 14 }}>
                <h2>Quick actions</h2>
              </div>
              <div className="quick-actions">
                {[
                  {
                    kind: "serviceRecords" as const,
                    label: "Log service",
                    icon: Wrench,
                  },
                  { kind: "fuelLogs" as const, label: "Add fuel", icon: Fuel },
                  { kind: "expenses" as const, label: "Expense", icon: Wallet },
                  {
                    kind: "documents" as const,
                    label: "Document",
                    icon: FileText,
                  },
                ].map((a) => (
                  <button
                    className="quick-action"
                    key={a.kind}
                    disabled={!vehicle}
                    onClick={() =>
                      setTarget({ kind: a.kind, vehicleId: selectedId })
                    }
                  >
                    <a.icon />
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Monthly spending</h2>
                  <p>Your monthly spending, at a glance.</p>
                </div>
                <span className="badge">
                  <CalendarDays size={10} />
                  {year}
                </span>
              </div>
              {summaryError || summaries.length === 0 ? (
                <EmptyState
                  title={summaryError ? "Spending unavailable" : "No expenses this year"}
                  description={summaryError ? "Refresh the page to try again." : "Log an expense to see your spending here."}
                />
              ) : (
                <>
                  <div className="chart-summary">
                    <strong>{money(annual)}</strong>
                    <span>spent this year</span>
                  </div>
                  <ExpenseChart data={chartData} />
                </>
              )}
              <div className="card-footer">
                <span className="legend">
                  <span>
                    <i />
                    All expenses · RM
                  </span>
                </span>
                <Link
                  href="/expenses"
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Explore expenses
                  <ChevronRight size={11} />
                </Link>
              </div>
            </section>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Recent activity</h2>
                  <p>The latest chapter in your garage.</p>
                </div>
                <Link href="/expenses">
                  View records
                  <ArrowRight size={12} />
                </Link>
              </div>
              {recent.length ? (
                <div className="activity-list">
                  {recent.map((e) => {
                    const v = vehicles.find((v) => v.id === e.vehicleId);
                    return (
                      <div
                        className="activity-item"
                        key={`${e.vehicleId}-${e.id}`}
                      >
                        <span className="item-icon">
                          {e.category === "Fuel" ? (
                            <Fuel size={14} />
                          ) : e.category === "Maintenance" ? (
                            <Wrench size={14} />
                          ) : (
                            <Wallet size={14} />
                          )}
                        </span>
                        <div className="item-content">
                          <strong>{e.description}</strong>
                          <p>
                            {v?.brand} {v?.model}
                          </p>
                        </div>
                        <div className="activity-price">
                          {money(e.amountSen)}
                          <small>{date(e.expenseDate)}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Your story starts here"
                  description="Services, fuel and expenses will appear as you record them."
                />
              )}
              <div className="card-footer">
                <span className="badge green">
                  {demo ? "Sample records" : "Account records"}
                </span>
                <span style={{ marginLeft: "auto" }}>
                  Keep moving. We’ll keep track.
                </span>
              </div>
            </section>
          </div>
        </>
      )}
      {target && (
        <RecordForm
          target={target}
          onClose={() => setTarget(null)}
          onSaved={target.kind === "vehicle" ? () => setVehicleAdded(true) : undefined}
        />
      )}
    </motion.div>
  );
}
