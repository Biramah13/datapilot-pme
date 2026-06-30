'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-20">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="mt-2 text-sm text-slate-400">Accédez à votre espace DataPilot PME.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="email" placeholder="Email" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Mot de passe" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950" type="submit">Se connecter</button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Pas encore de compte ? <Link href="/register" className="text-cyan-400">Créer un compte</Link>
        </p>
      </div>
    </main>
  );
}
