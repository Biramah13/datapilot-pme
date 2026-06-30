"use client";
import Link from "next/link";

export default function EmptyState({ title, description, actionLabel, actionHref }: { title?: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-100">{title || "Aucune donnée"}</h3>
      <p className="mt-2 text-sm text-slate-400">{description || "Importez un fichier CSV/Excel pour générer un dashboard."}</p>
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Link href={actionHref as any} className="inline-flex rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950">{actionLabel}</Link>
        </div>
      ) : null}
    </div>
  );
}