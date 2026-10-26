"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function DataTable({ caption, head, rows }: { caption: string; head: [string, string]; rows: [string, string][] }) {
  // Screen-reader equivalent of the chart (charts are not otherwise accessible).
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <div role="img" aria-label={`Revenue chart, total KES ${data.reduce((s, d) => s + d.revenue, 0).toLocaleString("en-KE")}`}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d3e6e4" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#5f7371" interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} stroke="#5f7371" width={60} />
          <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString("en-KE")}`} />
          <Line type="monotone" dataKey="revenue" stroke="#0f6e6e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <DataTable caption="Revenue by period" head={["Period", "Revenue (KES)"]} rows={data.map((d) => [d.label, String(d.revenue)])} />
    </div>
  );
}

export function EnrollmentsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div role="img" aria-label={`Enrollments chart, total ${data.reduce((s, d) => s + d.count, 0)}`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d3e6e4" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#5f7371" interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} stroke="#5f7371" width={30} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#b8841f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <DataTable caption="Enrollments by period" head={["Period", "Enrollments"]} rows={data.map((d) => [d.label, String(d.count)])} />
    </div>
  );
}
