"use client";

import Link from "next/link";
import { useState } from "react";

const menuLinks = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/predictions", label: "Prédictions" },
  { href: "/alertes", label: "Alertes" },
  { href: "/kpi", label: "Catalogue KPI" },
  { href: "/profile", label: "Profil entreprise" },
];

export default function Topbar({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="rounded-md p-2 text-xl leading-none text-slate-300 hover:bg-slate-800 hover:text-cyan-300"
          title="Menu de navigation"
        >
          ☰
        </button>
        <h4 className="text-lg font-semibold text-slate-100">Tableau de bord</h4>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden flex-col text-right sm:flex">
          <span className="text-sm text-slate-300">{userName || "Utilisateur"}</span>
          <span className="text-xs text-slate-500">Connecté</span>
        </div>
      </div>

      {open ? (
        <div className="absolute left-6 top-[calc(100%+0.5rem)] z-30 w-72 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-slate-950/60">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Navigation</div>
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as any}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}