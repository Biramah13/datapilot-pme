"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalysisFilters, askAssistant, clearToken, downloadExport, getAnalysis, getHistory, getMe, uploadFile } from "@/lib/api";
import KpiCard from "@/components/KpiCard";
import Loader from "@/components/Loader";
import EmptyState from "@/components/EmptyState";

const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("fr-FR");
const emptyFilters: AnalysisFilters = {};
const examples = [
  "Quels sont mes meilleurs clients ?",
  "Quel canal génère le plus de chiffre d'affaires ?",
  "Quelle ville est la plus performante ?",
  "Quel vendeur est le plus performant ?",
  "Le chiffre d'affaires est-il en baisse ?",
  "Propose-moi 3 actions commerciales.",
];

type AssistantMessage = { question: string; answer: string };

function formatCurrency(value: unknown) {
  const number = typeof value === "number" ? value : Number(value || 0);
  return euroFormatter.format(Number.isFinite(number) ? number : 0);
}

function formatPercent(value: unknown) {
  const number = typeof value === "number" ? value : Number(value || 0);
  return `${(Number.isFinite(number) ? number : 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function shortLabel(value: unknown, max = 18) {
  const label = String(value ?? "");
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function axisCurrency(value: unknown) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 10000) return `${Math.round(number / 1000).toLocaleString("fr-FR")} k€`;
  return `${Math.round(number).toLocaleString("fr-FR")} €`;
}

function metricName(item?: any) {
  return item?.name || "Non disponible";
}

function metricValue(item?: any) {
  return item?.value ? formatCurrency(item.value) : "-";
}

const currencyTooltip = (value: unknown) => [formatCurrency(value), "Chiffre d'affaires"];

function SelectFilter({ label, value, options, onChange }: { label: string; value?: string; options?: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-sm text-slate-300">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400">
        <option value="">Tous</option>
        {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ChartHint({ count }: { count: number }) {
  if (count === 0) return <div className="flex h-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/50 text-sm text-slate-400">Aucune donnée à afficher pour cette sélection.</div>;
  if (count <= 2) return <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Peu de points disponibles : le graphique donne une indication, mais l'analyse reste limitée.</div>;
  return null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [filters, setFilters] = useState<AnalysisFilters>(emptyFilters);
  const [question, setQuestion] = useState("");
  const [assistantHistory, setAssistantHistory] = useState<AssistantMessage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedDataset");
          localStorage.removeItem("selectedFile");
          localStorage.removeItem("activeDataset");
        }
        setSelectedFile(null);
        setAnalysis(null);
        setFilters(emptyFilters);
        setQuestion("");
        setAssistantHistory([]);
        const me = await getMe();
        setUser(me);
        const files = await getHistory();
        setHistory(files);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setStatus("Import en cours...");
    try {
      const result = await uploadFile(file);
      setStatus(`Fichier importé avec ${numberFormatter.format(result.row_count)} lignes`);
      const files = await getHistory();
      setHistory(files);
      setSelectedFile(result.id);
      setFilters(emptyFilters);
      setAssistantHistory([]);
      setAnalysis(result);
    } catch (err: any) {
      setStatus(err?.message || "Erreur lors de l'import. Vérifiez que le fichier est un CSV ou Excel valide.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysis(fileId: number, nextFilters: AnalysisFilters = filters) {
    setLoading(true);
    try {
      setAnalysis(await getAnalysis(fileId, nextFilters));
    } finally {
      setLoading(false);
    }
  }

  async function selectHistoryItem(id: number) {
    setSelectedFile(id);
    setFilters(emptyFilters);
    setAssistantHistory([]);
    await loadAnalysis(id, emptyFilters);
  }

  async function applyFilters() {
    if (selectedFile) await loadAnalysis(selectedFile, filters);
  }

  async function resetFilters() {
    if (!selectedFile) return;
    setFilters(emptyFilters);
    await loadAnalysis(selectedFile, emptyFilters);
  }

  async function handleAskAssistant(nextQuestion = question) {
    if (!nextQuestion.trim()) return;
    setLoading(true);
    try {
      const response = await askAssistant(nextQuestion, selectedFile || undefined);
      setAssistantHistory((items) => [{ question: nextQuestion, answer: response.answer }, ...items].slice(0, 8));
      setQuestion("");
    } catch {
      setAssistantHistory((items) => [{ question: nextQuestion, answer: "Erreur assistant" }, ...items]);
    } finally {
      setLoading(false);
    }
  }

  const dashboard = analysis?.dashboard || {};
  const filterOptions = analysis?.filters || {};
  const activeFile = useMemo(() => history.find((item) => item.id === selectedFile), [history, selectedFile]);
  const filteredRows = analysis?.row_count || 0;
  const totalRows = analysis?.total_row_count || filteredRows;
  const isLowData = analysis && filteredRows > 0 && filteredRows <= Math.max(3, totalRows * 0.02);

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">DataPilot PME</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">Tableau de bord</h1>
          <p className="mt-2 text-base text-slate-400">Bienvenue {user?.name || "utilisateur"}. {activeFile ? `Analyse de ${activeFile.original_name}` : "Importez un fichier ou sélectionnez un fichier dans l'historique pour afficher le dashboard."}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/kpi" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400">Catalogue KPI</Link>
          {selectedFile ? <Link href={`/datasets/${selectedFile}` as any} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400">Détail dataset</Link> : null}
          <Link href="/predictions" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400">Prédictions</Link>
          <Link href="/alertes" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-cyan-400">Alertes</Link>
          <button onClick={() => { clearToken(); window.location.href = "/login"; }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700">Déconnexion</button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-100">Importer un fichier</h2>
              <p className="mt-1 text-sm text-slate-400">CSV ou Excel, nettoyage automatique et analyse BI.</p>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm" />
            </div>
            <button onClick={handleUpload} className="h-12 rounded-lg bg-cyan-500 px-6 font-semibold text-slate-950 hover:bg-cyan-400">Traiter</button>
          </div>
          {status ? <p className="mt-3 text-sm text-cyan-300">{status}</p> : null}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-slate-100">Historique</h2>
          <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
            {history.length === 0 ? <EmptyState title="Aucun fichier importé" description="Importez votre premier fichier." actionLabel="Importer" actionHref="/dashboard" /> : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id} className={`rounded-lg border p-3 ${item.id === selectedFile ? "border-cyan-500/60 bg-cyan-500/10" : "border-slate-800 bg-slate-950/60"}`}>
                    <button onClick={() => selectHistoryItem(item.id)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium text-slate-100" title={item.original_name}>{item.original_name}</div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400"><span>{numberFormatter.format(item.row_count)} lignes</span><span className="rounded-md border border-slate-700 px-2 py-1 text-cyan-200">Analyser</span></div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {analysis ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Filtres d'analyse</h2>
              <p className="mt-1 text-sm text-slate-400">{numberFormatter.format(filteredRows)} lignes sur {numberFormatter.format(totalRows)}. Les KPI, graphiques, insights et alertes se recalculent après application.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={applyFilters} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Appliquer</button>
              <button onClick={resetFilters} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Réinitialiser</button>
              {selectedFile ? <button onClick={() => downloadExport(selectedFile, "csv", filters)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400">CSV nettoyé</button> : null}
              {selectedFile ? <button onClick={() => downloadExport(selectedFile, "excel", filters)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400">Excel .xlsx</button> : null}
              {selectedFile ? <button onClick={() => downloadExport(selectedFile, "pdf", filters)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400">PDF rapport</button> : null}
            </div>
          </div>
          {isLowData ? <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Peu de données correspondent à ce filtre, certains graphiques peuvent être limités.</div> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <label className="space-y-1 text-sm text-slate-300"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Début</span><input type="date" value={filters.start_date || ""} min={filterOptions.date_min || undefined} max={filterOptions.date_max || undefined} onChange={(event) => setFilters({ ...filters, start_date: event.target.value })} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm text-slate-300"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fin</span><input type="date" value={filters.end_date || ""} min={filterOptions.date_min || undefined} max={filterOptions.date_max || undefined} onChange={(event) => setFilters({ ...filters, end_date: event.target.value })} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" /></label>
            <SelectFilter label="Ville" value={filters.ville} options={filterOptions.villes} onChange={(value) => setFilters({ ...filters, ville: value })} />
            <SelectFilter label="Canal" value={filters.canal} options={filterOptions.canaux} onChange={(value) => setFilters({ ...filters, canal: value })} />
            <SelectFilter label="Client" value={filters.client} options={filterOptions.clients} onChange={(value) => setFilters({ ...filters, client: value })} />
            <SelectFilter label="Produit" value={filters.produit} options={filterOptions.produits} onChange={(value) => setFilters({ ...filters, produit: value })} />
            <SelectFilter label="Vendeur" value={filters.vendeur} options={filterOptions.vendeurs} onChange={(value) => setFilters({ ...filters, vendeur: value })} />
          </div>
        </section>
      ) : null}

      {loading ? <Loader /> : analysis ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Chiffre d'affaires" value={formatCurrency(dashboard.revenue_total)} />
            <KpiCard title="Marge totale" value={formatCurrency(dashboard.margin_total)} />
            <KpiCard title="Taux de marge" value={formatPercent(dashboard.margin_rate)} />
            <KpiCard title="Panier moyen" value={formatCurrency(dashboard.average_basket)} />
            <KpiCard title="Clients" value={numberFormatter.format(dashboard.client_count || 0)} />
            <KpiCard title="Produits" value={numberFormatter.format(dashboard.product_count || 0)} />
            <KpiCard title="Commandes payées" value={numberFormatter.format(dashboard.paid_order_count || 0)} />
            <KpiCard title="Non payées" value={numberFormatter.format(dashboard.unpaid_order_count || 0)} />
            <KpiCard title="Meilleure ville" value={metricName(dashboard.best_city)} subtitle={metricValue(dashboard.best_city)} />
            <KpiCard title="Meilleur canal" value={metricName(dashboard.best_channel)} subtitle={metricValue(dashboard.best_channel)} />
            <KpiCard title="Meilleur vendeur" value={metricName(dashboard.best_seller)} subtitle={metricValue(dashboard.best_seller)} />
            <KpiCard title="Commandes" value={numberFormatter.format(dashboard.order_count || 0)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold text-slate-100">Évolution mensuelle</h3><div className="mt-4 h-[430px]"><ChartHint count={(dashboard.monthly_evolution || []).length} />{(dashboard.monthly_evolution || []).length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.monthly_evolution || []} margin={{ left: 16, right: 24, bottom: 10 }}><CartesianGrid stroke="#0f172a" /><XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 13 }} /><YAxis stroke="#94a3b8" width={82} tickFormatter={axisCurrency} allowDecimals={false} /><Tooltip formatter={currencyTooltip} contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} /><Area type="monotone" dataKey="value" stroke="#22d3ee" fill="#0f766e" strokeWidth={2} /></AreaChart></ResponsiveContainer> : null}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold text-slate-100">Top clients</h3><div className="mt-4 h-[430px]"><ChartHint count={(dashboard.top_clients || []).length} />{(dashboard.top_clients || []).length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.top_clients || []} layout="vertical" margin={{ left: 12, right: 26 }}><CartesianGrid stroke="#0f172a" /><XAxis type="number" stroke="#94a3b8" tickFormatter={axisCurrency} allowDecimals={false} /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={220} tick={{ fontSize: 13 }} tickFormatter={(value) => shortLabel(value, 30)} /><Tooltip formatter={currencyTooltip} labelFormatter={(label) => String(label)} contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} /><Bar dataKey="value" fill="#38bdf8" radius={[0, 5, 5, 0]} maxBarSize={46} /></BarChart></ResponsiveContainer> : null}</div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold text-slate-100">Top produits</h3><div className="mt-4 h-96"><ChartHint count={(dashboard.top_products || []).length} />{(dashboard.top_products || []).length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.top_products || []} layout="vertical" margin={{ left: 8, right: 26 }}><CartesianGrid stroke="#0f172a" /><XAxis type="number" stroke="#94a3b8" tickFormatter={axisCurrency} allowDecimals={false} /><YAxis dataKey="name" type="category" stroke="#94a3b8" width={240} tick={{ fontSize: 13 }} tickFormatter={(value) => shortLabel(value, 34)} /><Tooltip formatter={currencyTooltip} labelFormatter={(label) => String(label)} contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} /><Bar dataKey="value" fill="#22d3ee" radius={[0, 5, 5, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer> : null}</div></div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold text-slate-100">Canaux performants</h3><div className="mt-4 h-96"><ChartHint count={(dashboard.top_channels || []).length} />{(dashboard.top_channels || []).length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard.top_channels || []} margin={{ left: 16, right: 24, bottom: 48 }}><CartesianGrid stroke="#0f172a" /><XAxis dataKey="name" stroke="#94a3b8" interval={0} angle={-18} textAnchor="end" height={62} tick={{ fontSize: 13 }} tickFormatter={(value) => shortLabel(value, 16)} /><YAxis stroke="#94a3b8" width={82} tickFormatter={axisCurrency} allowDecimals={false} /><Tooltip formatter={currencyTooltip} labelFormatter={(label) => String(label)} contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 8 }} /><Bar dataKey="value" fill="#2dd4bf" radius={[5, 5, 0, 0]} maxBarSize={58} /></BarChart></ResponsiveContainer> : null}</div></div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-xl font-semibold text-slate-100">Assistant IA</h3>{assistantHistory.length ? <button onClick={() => { if (window.confirm("Effacer l'historique de l'assistant ?")) setAssistantHistory([]); }} className="w-fit rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400">Effacer l'historique</button> : null}</div><div className="mt-4 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => handleAskAssistant(example)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-200">{example}</button>)}</div><div className="mt-4 flex flex-col gap-3 lg:flex-row"><input className="min-h-12 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none focus:border-cyan-400" placeholder="Posez une question sur vos données" value={question} onChange={(event) => setQuestion(event.target.value)} /><button onClick={() => handleAskAssistant()} className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400">Demander</button></div><div className="mt-4 max-h-[520px] space-y-4 overflow-auto pr-1">{assistantHistory.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4"><div className="text-sm font-semibold text-cyan-200">{item.question}</div><div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">{item.answer}</div><button onClick={() => navigator.clipboard?.writeText(item.answer)} className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400">Copier la réponse</button></div>)}{!assistantHistory.length ? <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Choisissez un exemple ou posez une question. Les réponses resteront affichées ici.</div> : null}</div></div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1"><div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-lg font-semibold text-slate-100">Insights automatiques</h3><ul className="mt-4 space-y-3 text-sm text-slate-300">{(analysis.insights || []).map((insight: string, index: number) => <li key={index} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">{insight}</li>)}</ul></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h3 className="text-lg font-semibold text-slate-100">Alertes</h3><ul className="mt-4 space-y-3 text-sm text-slate-300">{(analysis.alerts || []).map((alert: any, index: number) => <li key={index} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">{alert.message}</li>)}{!analysis.alerts?.length ? <li className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">Aucune alerte détectée.</li> : null}</ul></div></div>
          </section>
        </>
      ) : <div className="mt-8"><EmptyState title="Aucun dataset sélectionné" description="Importez un fichier ou sélectionnez un fichier dans l'historique pour afficher le dashboard." actionLabel="Voir l'historique" actionHref="/dashboard" /></div>}
    </div>
  );
}