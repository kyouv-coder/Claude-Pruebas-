"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function RevenueTrendChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopServicesChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted)" }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          width={140}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
