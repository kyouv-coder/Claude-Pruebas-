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
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#111"
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
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          width={140}
        />
        <Tooltip />
        <Bar dataKey="count" fill="#111" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
