import React from "react";

export default function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-md bg-white/5 px-4 py-4">
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
    </div>
  );
}
