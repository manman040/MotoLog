"use client";
import { useState } from "react";
import Link from "next/link";
import { Calendar, Fuel, Plus, Wallet } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { PageHeading, Stat, VehicleSelect } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { RecordForm, type FormTarget } from "@/components/shared/record-form";
import { RecordList } from "@/components/shared/record-list";
import { ExpenseChart } from "@/components/shared/charts";
import { useSummaries } from "@/hooks/use-summaries";
import { money, today } from "@/lib/formatting";
export default function Expenses() {
  const { selectedId, vehicles } = useData();
  const [target, setTarget] = useState<FormTarget | null>(null);
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  const { summaries, error } = useSummaries(year);
  const total = summaries.reduce((s, m) => s + m.totalSen, 0);
  const breakdown: Record<string, number> = {};
  const vehicleCosts: Record<string, number> = {};
  for (const s of summaries) {
    for (const [key, value] of Object.entries(s.categories))
      breakdown[key] = (breakdown[key] || 0) + value;
    for (const [key, value] of Object.entries(s.vehicles))
      vehicleCosts[key] = (vehicleCosts[key] || 0) + value;
  }
  const data = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(year, i, 1).toLocaleDateString("en-MY", { month: "short" }),
    value:
      summaries.find(
        (s) => s.month === `${year}-${String(i + 1).padStart(2, "0")}`,
      )?.totalSen || 0,
  }));
  return (
    <>
      <PageHeading
        eyebrow="KNOW WHAT YOUR JOURNEY COSTS"
        title="Expenses"
        description="One clear picture of every ringgit. Linked services and fuel are counted once."
      >
        <Button asChild variant="outline">
          <Link href="/fuel">
            <Fuel size={15} />
            Fuel logs
          </Link>
        </Button>
        <Button
          disabled={!selectedId}
          onClick={() => setTarget({ kind: "expenses", vehicleId: selectedId })}
        >
          <Plus size={15} />
          Add expense
        </Button>
      </PageHeading>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div className="filter-bar">
        <select
          aria-label="Analytics year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {Array.from(
            { length: 10 },
            (_, i) => Number(today().slice(0, 4)) - i,
          ).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <span className="badge">Analytics: all vehicles</span>
      </div>
      <div className="stats-grid">
        <Stat
          title="Annual expenses"
          value={money(total)}
          foot={`All vehicles · ${year}`}
          icon={<Wallet size={16} />}
        />
        <Stat
          title="This month"
          value={money(
            summaries.find((s) => s.month === today().slice(0, 7))?.totalSen ||
              0,
          )}
          foot="Calendar month · all vehicles"
          icon={<Calendar size={16} />}
        />
        <Stat
          title="Monthly average"
          value={money(total / 12)}
          foot="Annual total / 12 months"
          icon={<Wallet size={16} />}
        />
        <Stat
          title="Fuel spending"
          value={money(breakdown.Fuel || 0)}
          foot={`All vehicles · ${year}`}
          icon={<Fuel size={16} />}
        />
      </div>
      <div className="expense-charts" id="analytics">
        <section className="card">
          <div className="card-header">
            <h2>Monthly expense trend</h2>
            <span className="badge">RM · {year}</span>
          </div>
          <ExpenseChart data={data} />
        </section>
        <section className="card">
          <div className="card-header">
            <h2>Expense breakdown</h2>
          </div>
          <ExpenseChart
            type="pie"
            data={Object.entries(breakdown)
              .filter(([, v]) => v > 0)
              .map(([name, value]) => ({ name, value }))}
          />
          <div className="card-footer" style={{ flexWrap: "wrap" }}>
            {Object.entries(breakdown).map(([k, v]) => (
              <span key={k}>
                {k}: {money(v)} ·{" "}
              </span>
            ))}
          </div>
        </section>
        <section className="card" style={{ gridColumn: "1/-1" }}>
          <div className="card-header">
            <h2>Cost by vehicle</h2>
          </div>
          <ExpenseChart
            type="bar"
            data={vehicles.map((v) => ({
              name: `${v.brand} ${v.model}`,
              value: vehicleCosts[v.id] || 0,
            }))}
          />
        </section>
      </div>
      <div className="card-header" style={{ paddingLeft: 0 }}>
        <h2>Expense records</h2>
        <VehicleSelect />
      </div>
      <RecordList
        key={selectedId}
        kind="expenses"
        vehicleId={selectedId}
        onEdit={(initial) =>
          setTarget({ kind: "expenses", vehicleId: selectedId, initial })
        }
      />
      {target && <RecordForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
