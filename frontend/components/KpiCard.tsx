"use client";
import React from "react";

export default function KpiCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="min-h-36 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-900/45 p-5 shadow-sm">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-4 min-w-0">
        <div className="break-words text-[clamp(1.35rem,1.8vw,1.875rem)] font-semibold leading-tight tracking-tight text-white" title={String(value)}>{value}</div>
        {subtitle ? <div className="mt-2 break-words text-sm leading-5 text-slate-400" title={subtitle}>{subtitle}</div> : null}
      </div>
    </div>
  );
}