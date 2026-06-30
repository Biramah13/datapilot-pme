"use client";
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/dashboard", label: "Import / Fichiers" },
  { href: "/predictions", label: "Prédictions" },
  { href: "/alertes", label: "Alertes" },
  { href: "/kpi", label: "Catalogue KPI" },
  { href: "/profile", label: "Profil entreprise" },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-5 lg:flex 2xl:w-72">
      <div className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-cyan-400">DataPilot PME</h3>
        <p className="mt-2 text-sm text-slate-300">Pilotage BI pour PME</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link key={link.label} href={link.href as any} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs leading-5 text-slate-400">
        Portfolio data/BI<br />FastAPI + Next.js + ML
      </div>
    </aside>
  );
}