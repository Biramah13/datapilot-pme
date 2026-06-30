"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cleanDataset, downloadExport, getDatasetDetail } from "@/lib/api";
import Loader from "@/components/Loader";

const numberFormatter = new Intl.NumberFormat("fr-FR");
const pageSize = 10;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DatasetDetailPage() {
  const params = useParams<{ id: string }>();
  const fileId = Number(params.id);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try { setDetail(await getDatasetDetail(fileId)); } finally { setLoading(false); }
  }

  useEffect(() => { if (Number.isFinite(fileId) && fileId > 0) load(); else setLoading(false); }, [fileId]);

  async function handleClean() {
    setStatus("Nettoyage en cours...");
    await cleanDataset(fileId);
    await load();
    setStatus("Dataset nettoyé et analyse recalculée.");
  }

  const rows = detail?.preview?.sample_rows || [];
  const columns = useMemo(() => detail?.preview?.columns || [], [detail]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = query ? rows.filter((row: any) => columns.some((column: string) => displayValue(row[column]).toLowerCase().includes(query))) : rows;
    if (sortColumn) {
      result = [...result].sort((a: any, b: any) => {
        const av = displayValue(a[sortColumn]);
        const bv = displayValue(b[sortColumn]);
        return sortDirection === "asc" ? av.localeCompare(bv, "fr", { numeric: true }) : bv.localeCompare(av, "fr", { numeric: true });
      });
    }
    return result;
  }, [rows, columns, search, sortColumn, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(column: string) {
    if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setSortDirection("asc"); }
  }

  if (loading) return <Loader />;
  if (!detail) return <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-300">Aucun dataset sélectionné. Retournez au dashboard et choisissez un fichier dans l'historique.</div>;

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">Détail dataset</p><h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">{detail.original_name}</h1><p className="mt-2 text-base text-slate-400">Aperçu, qualité des données, colonnes et exports.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Dashboard</Link><button onClick={handleClean} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Nettoyer</button><button onClick={() => downloadExport(fileId, "csv")} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Télécharger les données nettoyées</button><button onClick={() => downloadExport(fileId, "excel")} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">Excel .xlsx</button><button onClick={() => downloadExport(fileId, "pdf")} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-cyan-400">PDF</button></div>
      </div>
      {status ? <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">{status}</div> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Score avant</div><div className="mt-3 text-4xl font-semibold text-white">{detail.quality_score_before}/100</div></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Score après</div><div className="mt-3 text-4xl font-semibold text-white">{detail.quality_score_after}/100</div></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Lignes</div><div className="mt-3 text-4xl font-semibold text-white">{numberFormatter.format(detail.row_count)}</div></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Colonnes</div><div className="mt-3 text-4xl font-semibold text-white">{numberFormatter.format(detail.column_count)}</div></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Valeurs manquantes</div><div className="mt-3 text-4xl font-semibold text-white">{numberFormatter.format(detail.missing_total)}</div></div><div className="rounded-lg border border-slate-800 bg-slate-900 p-5"><div className="text-sm uppercase tracking-wide text-slate-500">Doublons</div><div className="mt-3 text-4xl font-semibold text-white">{numberFormatter.format(detail.duplicate_count)}</div></div></section>
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Types et qualité par colonne</h2><div className="mt-4 overflow-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-800"><th className="px-3 py-3">Colonne</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Valeurs manquantes</th><th className="px-3 py-3">Taux</th><th className="px-3 py-3">Valeurs uniques</th></tr></thead><tbody className="divide-y divide-slate-800 text-slate-200">{detail.columns.map((column: any) => <tr key={column.name}><td className="px-3 py-3 font-medium text-white">{column.name}</td><td className="px-3 py-3 text-slate-300">{column.type_label || column.type}</td><td className="px-3 py-3">{numberFormatter.format(column.missing)}</td><td className="px-3 py-3">{column.missing_rate}%</td><td className="px-3 py-3">{numberFormatter.format(column.unique)}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-semibold text-white">Aperçu des 20 premières lignes</h2><p className="mt-1 text-sm text-slate-400">Recherche, tri et pagination sur l'aperçu.</p></div><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher dans l'aperçu" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400 lg:max-w-sm" /></div><div className="mt-4 overflow-auto"><table className="min-w-full text-left text-xs"><thead className="text-slate-500"><tr className="border-b border-slate-800">{columns.map((column: string) => <th key={column} className="whitespace-nowrap px-3 py-3"><button onClick={() => toggleSort(column)} className="hover:text-cyan-300">{column}{sortColumn === column ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}</button></th>)}</tr></thead><tbody className="divide-y divide-slate-800 text-slate-300">{visibleRows.map((row: any, index: number) => <tr key={index}>{columns.map((column: string) => <td key={column} className="max-w-52 truncate whitespace-nowrap px-3 py-3" title={displayValue(row[column])}>{displayValue(row[column])}</td>)}</tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between text-sm text-slate-400"><span>{numberFormatter.format(filteredRows.length)} lignes dans l'aperçu</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Précédent</button><span>Page {page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Suivant</button></div></div></section>
    </div>
  );
}