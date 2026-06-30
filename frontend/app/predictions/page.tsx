"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalysis, getHistory } from "@/lib/api";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";

const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value || 0);
  return euroFormatter.format(Number.isFinite(number) ? number : 0);
}

function axisCurrency(value: unknown) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000) return `${Math.round(number / 1000)} k€`;
  return `${Math.round(number)} €`;
}

function trendLabel(trend?: string) {
  if (trend === "hausse") return "Hausse";
  if (trend === "baisse") return "Baisse";
  if (trend === "stable") return "Stable";
  return "Données insuffisantes";
}

export default function PredictionsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const files = await getHistory();
        setHistory(files);
        if (files[0]) {
          setSelectedFile(files[0].id);
          setAnalysis(await getAnalysis(files[0].id));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function selectFile(fileId: number) {
    setSelectedFile(fileId);
    setLoading(true);
    try {
      setAnalysis(await getAnalysis(fileId));
    } finally {
      setLoading(false);
    }
  }

  const prediction = analysis?.predictions || {};
  const chartData = useMemo(() => {
    const historical = (prediction.historical || []).map((item: any) => ({
      month: item.month,
      historique: item.value,
      prévision: null,
      borne_basse: null,
      borne_haute: null,
    }));
    const forecast = (prediction.forecast || []).map((item: any) => ({
      month: item.month,
      historique: null,
      prévision: item.value,
      borne_basse: item.low,
      borne_haute: item.high,
    }));
    return [...historical, ...forecast];
  }, [prediction]);

  if (loading) return <Loader />;

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">Data Science</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">Prédictions</h1>
          <p className="mt-2 text-base text-slate-400">Prévision du chiffre d'affaires sur 3 mois, tendance et mois anormaux.</p>
        </div>
        <Link href="/dashboard" className="w-fit rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Retour dashboard</Link>
      </div>

      {history.length ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <label className="text-sm text-slate-300">
            Dataset
            <select value={selectedFile || ""} onChange={(event) => selectFile(Number(event.target.value))} className="mt-2 h-11 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400">
              {history.map((item) => <option key={item.id} value={item.id}>{item.original_name}</option>)}
            </select>
          </label>
        </section>
      ) : <EmptyState title="Aucun fichier" description="Importez un fichier pour générer des prédictions." actionLabel="Dashboard" actionHref="/dashboard" />}

      {analysis ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-500">Tendance</div>
              <div className="mt-3 text-3xl font-semibold text-white">{trendLabel(prediction.trend)}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-500">Confiance</div>
              <div className="mt-3 text-3xl font-semibold text-white">{prediction.confidence_score ?? 0} %</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-500">Prochain mois</div>
              <div className="mt-3 text-3xl font-semibold text-white">{prediction.forecast?.[0] ? formatCurrency(prediction.forecast[0].value) : "-"}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div className="text-sm uppercase tracking-wide text-slate-500">Mois anormaux</div>
              <div className="mt-3 text-3xl font-semibold text-white">{prediction.anomalies?.length || 0}</div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="text-xl font-semibold text-white">Historique et prévision</h2>
                <p className="mt-2 text-sm text-slate-400">{prediction.message}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-white">Méthode : </span>{prediction.method || "Prévision calculée à partir des ventes mensuelles."}
              </div>
            </div>

            {prediction.trend === "insufficient_data" ? (
              <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Les données disponibles ne suffisent pas pour produire une prévision robuste. Importez au moins 3 mois d'historique avec une colonne date et une colonne chiffre d'affaires.
              </div>
            ) : null}

            <div className="mt-5 h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 20, right: 30, bottom: 20 }}>
                  <CartesianGrid stroke="#0f172a" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" width={90} tickFormatter={axisCurrency} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [formatCurrency(value), String(name).replace("borne_", "borne ")]}
                    contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Line type="monotone" dataKey="historique" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="prévision" stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="borne_basse" stroke="#fbbf24" strokeDasharray="2 5" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="borne_haute" stroke="#fbbf24" strokeDasharray="2 5" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-white">Prévision 3 mois</h2>
              <ul className="mt-4 space-y-3">
                {(prediction.forecast || []).length ? prediction.forecast.map((item: any) => (
                  <li key={item.month} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-slate-200">{item.month}</span>
                      <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Fourchette estimée : {formatCurrency(item.low)} à {formatCurrency(item.high)}</p>
                  </li>
                )) : <li className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-slate-300">Aucune prévision disponible pour ce dataset.</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-white">Mois anormaux détectés</h2>
              <ul className="mt-4 space-y-3">
                {(prediction.anomalies || []).length ? prediction.anomalies.map((item: any) => (
                  <li key={item.month} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-slate-200">
                    <div className="font-semibold text-white">{item.month} : {formatCurrency(item.value)}</div>
                    <p className="mt-2 text-sm text-amber-100">{item.reason || "Ce mois s'écarte fortement du niveau moyen observé."}</p>
                  </li>
                )) : <li className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-slate-200">Aucun mois fortement anormal détecté.</li>}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}