import { PanelShellProps } from "@/lib/query-builder";
import React from "react";

export default function PanelShell({
  title,
  subtitle,
  children,
  actions,
}: PanelShellProps) {
  return (
    <section className="overflow-hidden rounded-md bg-white/5">
      <div className="px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-400">
              {subtitle}
            </p>
          </div>
          {actions}
        </div>
      </div>
      <div className="px-5 py-5 md:px-6">{children}</div>
    </section>
  );
}
