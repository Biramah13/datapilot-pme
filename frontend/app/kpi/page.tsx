const kpis = [
  {
    name: "Chiffre d'affaires",
    formula: "somme(chiffre_affaires)",
    description: "Mesure le volume total des ventes sur la période filtrée.",
  },
  {
    name: "Marge totale",
    formula: "somme(marge) ou somme(chiffre_affaires - coût_total)",
    description: "Estime la rentabilité brute générée par l'activité.",
  },
  {
    name: "Taux de marge",
    formula: "marge totale / chiffre d'affaires × 100",
    description: "Indique la part du chiffre d'affaires conservée en marge.",
  },
  {
    name: "Panier moyen",
    formula: "chiffre d'affaires / nombre de commandes",
    description: "Suit la valeur moyenne d'une commande client.",
  },
  {
    name: "Clients distincts",
    formula: "nombre unique(client)",
    description: "Mesure la taille de la base client active dans le dataset.",
  },
  {
    name: "Produits distincts",
    formula: "nombre unique(produit)",
    description: "Mesure la diversité du catalogue vendu sur la période.",
  },
  {
    name: "Meilleure ville",
    formula: "groupby(ville).somme(chiffre_affaires).top(1)",
    description: "Identifie la zone géographique qui génère le plus de ventes.",
  },
  {
    name: "Meilleur canal",
    formula: "groupby(canal).somme(chiffre_affaires).top(1)",
    description: "Repère le canal de vente le plus performant.",
  },
  {
    name: "Meilleur vendeur",
    formula: "groupby(vendeur).somme(chiffre_affaires).top(1)",
    description: "Met en avant le commercial ou vendeur le plus contributeur.",
  },
  {
    name: "Taux de paiement",
    formula: "commandes payées / total commandes × 100",
    description: "Suit la part des commandes réglées et aide à repérer les impayés.",
  },
];

export default function KpiCatalogPage() {
  return (
    <div className="mx-auto w-full max-w-none space-y-6 px-2 xl:px-6 2xl:px-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-400">Référentiel BI</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">Catalogue KPI</h1>
        <p className="mt-2 max-w-3xl text-base text-slate-400">
          Chaque indicateur est documenté avec sa formule et son utilité métier pour rendre le dashboard plus transparent.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <article key={kpi.name} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">{kpi.name}</h2>
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-200">
              {kpi.formula}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{kpi.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}