"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export function RevenueTrendChart({
  data,
  ariaLabel,
}: {
  data: { date: string; revenue: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} aria-hidden="true">
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
    </div>
  );
}

export function TopServicesChart({
  data,
  ariaLabel,
}: {
  data: { name: string; count: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" aria-hidden="true">
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
    </div>
  );
}

export function NetProfitTrendChart({
  data,
  ariaLabel,
}: {
  data: { label: string; net: number }[];
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} aria-hidden="true">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.net >= 0 ? "var(--success)" : "var(--danger)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
