"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d3e6e4" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#8a9c9a" />
        <YAxis tick={{ fontSize: 11 }} stroke="#8a9c9a" width={60} />
        <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString("en-KE")}`} />
        <Line type="monotone" dataKey="revenue" stroke="#0f6e6e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EnrollmentsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d3e6e4" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#8a9c9a" interval={4} />
        <YAxis tick={{ fontSize: 11 }} stroke="#8a9c9a" width={30} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#d6a23c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
