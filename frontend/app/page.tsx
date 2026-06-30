import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="grid gap-8 rounded-3xl border border-slate-700 bg-slate-900/80 p-10 shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              SaaS BI pour PME
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              DataPilot PME transforme vos fichiers en décisions instantanées.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Importez vos données, nettoyez-les automatiquement, accédez à un dashboard BI et obtenez des insights et des prédictions simples en quelques minutes.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="rounded-xl bg-cyan-500 px-6 py-3 font-medium text-slate-950">
                Créer un compte
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-600 px-6 py-3 font-medium text-white">
                Se connecter
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-8">
            <h2 className="text-xl font-semibold">Fonctionnalités clés</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>• Import Excel / CSV</li>
              <li>• Nettoyage automatique</li>
              <li>• Dashboard KPI & graphiques</li>
              <li>• Insights automatisés</li>
              <li>• Assistant IA local / OpenAI</li>
              <li>• Prédictions sur 3 mois</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
