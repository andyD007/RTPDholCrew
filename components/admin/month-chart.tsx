"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Single-series monthly bar chart. One series → no legend (the panel title
 * names it); gold marks with 4px rounded tops, recessive grid, hover tooltip.
 */
export function MonthChart({
  data,
  format = "count",
  label,
}: {
  data: { month: string; label: string; value: number }[];
  format?: "count" | "currency";
  label: string;
}) {
  const fmt = (v: number) => (format === "currency" ? `$${Math.round(v / 100).toLocaleString()}` : v.toLocaleString());
  return (
    <div className="h-56 w-full" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${fmt(d.value)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8a8a8a", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8a8a8a", fontSize: 11 }} width={format === "currency" ? 56 : 32} tickFormatter={fmt} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#161616", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, color: "#fff" }}
            labelStyle={{ color: "#a7a7a7" }}
            formatter={(v) => [fmt(Number(v)), label]}
          />
          <Bar dataKey="value" fill="#D6A84B" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
