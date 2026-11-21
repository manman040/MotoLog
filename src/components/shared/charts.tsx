"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/formatting";
export type ChartDatum = { name: string; value: number };
const colors = [
  "var(--primary)",
  "#427caa",
  "var(--warning)",
  "var(--success)",
  "var(--error)",
  "#69568f",
];
export function ExpenseChart({
  data,
  type = "area",
}: {
  data: ChartDatum[];
  type?: "area" | "pie" | "bar";
}) {
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`${type === "area" ? "Monthly spending" : type === "pie" ? "Expense breakdown" : "Vehicle cost comparison"}: ${data.map((d) => `${d.name} ${money(d.value)}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        {type === "pie" ? (
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={5}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
              }}
            />
          </PieChart>
        ) : type === "bar" ? (
          <BarChart
            data={data}
            margin={{ left: 0, right: 20, top: 15, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v / 100}`}
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ left: 0, right: 20, top: 15, bottom: 0 }}
          >
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={(v) => `${v / 100}`}
              tick={{ fill: "var(--muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
