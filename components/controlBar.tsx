import React from "react";

export default function ControlBar({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
        {label}
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-300">{helper}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
