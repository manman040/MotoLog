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
  "#a78bfa",
  "#22d3ee",
  "#e9b767",
  "#74c99e",
  "#f38c9e",
  "#70708f",
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
                background: "#202027",
                border: "1px solid #383842",
                borderRadius: 8,
                color: "#eee",
              }}
            />
          </PieChart>
        ) : type === "bar" ? (
          <BarChart
            data={data}
            margin={{ left: 0, right: 20, top: 15, bottom: 0 }}
          >
            <CartesianGrid stroke="#26262f" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#777789", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v / 100}`}
              tick={{ fill: "#777789", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "#202027",
                border: "1px solid #383842",
                borderRadius: 8,
              }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              fill="#a78bfa"
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
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#282830"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "#777789", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={(v) => `${v / 100}`}
              tick={{ fill: "#777789", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "#202027",
                border: "1px solid #383842",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#a78bfa"
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
