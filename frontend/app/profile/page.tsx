"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProfile, updateProfile } from "@/lib/api";
import Loader from "@/components/Loader";

type ProfileForm = {
  name: string;
  sector: string;
  country: string;
  city: string;
  currency: string;
  size: string;
  contact_email: string;
  address: string;
};

const emptyForm: ProfileForm = {
  name: "",
  sector: "",
  country: "",
  city: "",
  currency: "EUR",
  size: "",
  contact_email: "",
  address: "",
};

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span className="font-semibold text-slate-200">{label}</span>
      <input
        className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm outline-none focus:border-cyan-400"
        placeholder={placeholder || label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getProfile();
        setProfile(data);
        setForm({ ...emptyForm, ...data.company, currency: data.company.currency || "EUR" });
      } catch (err: any) {
        setError(err?.message || "Impossible de charger le profil entreprise.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateProfile(form);
      setProfile({ ...profile, company: updated.company || form });
      setMessage(updated.message || "Profil entreprise mis à jour.");
    } catch (err: any) {
      setError(err?.message || "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">Profil entreprise</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">{profile?.company?.name || "Entreprise"}</h1>
          <p className="mt-2 text-base text-slate-400">Informations utilisées pour personnaliser le reporting PME.</p>
        </div>
        <Link href="/dashboard" className="w-fit rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-400">Retour dashboard</Link>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nom de l'entreprise" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="Secteur" value={form.sector} onChange={(value) => setForm({ ...form, sector: value })} />
          <Field label="Pays" value={form.country} onChange={(value) => setForm({ ...form, country: value })} />
          <Field label="Ville" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
          <Field label="Devise" value={form.currency} onChange={(value) => setForm({ ...form, currency: value.toUpperCase() })} placeholder="EUR" />
          <Field label="Taille" value={form.size} onChange={(value) => setForm({ ...form, size: value })} />
          <Field label="Email contact" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <Field label="Adresse" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button disabled={saving} onClick={handleSave} className="rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}