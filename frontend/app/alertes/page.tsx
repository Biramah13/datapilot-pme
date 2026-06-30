"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAnalysis, getHistory } from "@/lib/api";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";

type AlertStatus = "nouveau" | "lu" | "résolu";

type AlertLevel = {
  label: "faible" | "moyen" | "élevé";
  className: string;
};

function storageKey(fileId: number) {
  return `datapilot-alert-status-${fileId}`;
}

function alertLevel(severity?: string): AlertLevel {
  if (severity === "critical") return { label: "élevé", className: "bg-red-500/15 text-red-200" };
  if (severity === "warning") return { label: "moyen", className: "bg-amber-500/15 text-amber-200" };
  return { label: "faible", className: "bg-cyan-500/15 text-cyan-200" };
}

export default function AlertsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AlertStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFile(fileId: number) {
    setSelectedFile(fileId);
    setLoading(true);
    setError("");
    try {
      setAnalysis(await getAnalysis(fileId));
      const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey(fileId)) : null;
      setStatuses(saved ? JSON.parse(saved) : {});
    } catch (err: any) {
      setError(err?.message || "Impossible de charger les alertes.");
      setAnalysis(null);
      setStatuses({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setSelectedFile(null);
        setAnalysis(null);
        setStatuses({});
        const files = await getHistory();
        setHistory(files);
      } catch (err: any) {
        setError(err?.message || "Impossible de charger l'historique.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function setStatus(index: number, status: AlertStatus) {
    if (!selectedFile) return;
    const next = { ...statuses, [String(index)]: status };
    setStatuses(next);
    localStorage.setItem(storageKey(selectedFile), JSON.stringify(next));
  }

  const alerts = analysis?.alerts || [];
  const counters = useMemo(() => {
    const result: Record<AlertStatus, number> = { nouveau: 0, lu: 0, résolu: 0 };
    alerts.forEach((_: any, index: number) => {
      result[statuses[String(index)] || "nouveau"] += 1;
    });
    return result;
  }, [alerts, statuses]);

  if (loading) return <Loader />;

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">Pilotage des risques</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">Alertes</h1>
          <p className="mt-2 text-base text-slate-400">Choisissez un dataset pour afficher les alertes métier.</p>
        </div>
        <Link href="/dashboard" className="w-fit rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Retour dashboard</Link>
      </div>

      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      {history.length ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">Historique des datasets</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.map((item) => (
              <button key={item.id} onClick={() => loadFile(item.id)} className={`rounded-lg border p-4 text-left hover:border-cyan-400 ${item.id === selectedFile ? "border-cyan-500/60 bg-cyan-500/10" : "border-slate-800 bg-slate-950/60"}`}>
                <div className="truncate text-sm font-semibold text-white" title={item.original_name}>{item.original_name}</div>
                <div className="mt-2 text-xs text-slate-400">{item.row_count?.toLocaleString("fr-FR")} lignes</div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-300">Ouvrir</div>
              </button>
            ))}
          </div>
        </section>
      ) : <EmptyState title="Aucun fichier" description="Importez un fichier pour générer des alertes." actionLabel="Dashboard" actionHref="/dashboard" />}

      {!analysis ? (
        <EmptyState title="Aucun dataset sélectionné" description="Aucun dataset sélectionné. Retournez au dashboard et choisissez un fichier dans l'historique." actionLabel="Retour dashboard" actionHref="/dashboard" />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Nouvelles</div><div className="mt-3 text-4xl font-semibold text-white">{counters.nouveau}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Lues</div><div className="mt-3 text-4xl font-semibold text-white">{counters.lu}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Résolues</div><div className="mt-3 text-4xl font-semibold text-white">{counters.résolu}</div></div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">Liste des alertes</h2>
            <div className="mt-4 space-y-3">
              {alerts.length ? alerts.map((alert: any, index: number) => {
                const current = statuses[String(index)] || "nouveau";
                const level = alertLevel(alert.severity);
                return (
                  <div key={`${alert.type}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${level.className}`}>niveau {level.label}</span><span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold uppercase text-slate-300">statut {current}</span></div>
                        <p className="mt-3 text-base text-slate-100">{alert.message}</p>
                        <p className="mt-1 text-sm text-slate-500">Type : {alert.type || "alerte"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2"><button onClick={() => setStatus(index, "lu")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 disabled:opacity-50" disabled={current === "lu"}>Marquer comme lu</button><button onClick={() => setStatus(index, "résolu")} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50" disabled={current === "résolu"}>Résoudre</button><button onClick={() => setStatus(index, "nouveau")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400 disabled:opacity-50" disabled={current === "nouveau"}>Remettre nouveau</button></div>
                    </div>
                  </div>
                );
              }) : <EmptyState title="Aucune alerte" description="Aucune anomalie métier détectée sur ce dataset." />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}