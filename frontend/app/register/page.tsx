'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { register } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', name: '', company_name: '', sector: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-20">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold">Créer votre espace</h1>
        <p className="mt-2 text-sm text-slate-400">Commencez votre parcours BI en quelques secondes.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="text" placeholder="Nom complet" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input type="email" placeholder="Email" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Mot de passe" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input type="text" placeholder="Nom de l’entreprise" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
          <input type="text" placeholder="Secteur" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950" type="submit">Créer mon compte</button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Vous avez déjà un compte ? <Link href="/login" className="text-cyan-400">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
