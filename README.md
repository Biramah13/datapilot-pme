# DataPilot PME

DataPilot PME est une application SaaS de Business Intelligence pour petites entreprises. Elle permet d'importer des fichiers CSV/Excel, de nettoyer les données, de générer un dashboard KPI, d'obtenir des insights, de consulter des prédictions de chiffre d'affaires, de suivre des alertes métier et d'interroger un assistant IA.

## Proposition de valeur

L'application transforme un simple fichier de ventes en tableau de bord exploitable : chiffre d'affaires, marge, clients clés, produits performants, canaux de vente, villes, vendeurs, paiements, prédictions et recommandations commerciales.

## Fonctionnalités

- Authentification JWT et espace entreprise.
- Import CSV, XLSX et XLS.
- Nettoyage automatique des données avec Pandas.
- Dashboard responsive avec KPI, graphiques, insights et alertes recalculés selon les filtres.
- Filtres : période, ville, canal, client, produit et vendeur.
- Compteur de lignes filtrées, par exemple `2 lignes sur 509`, avec message d'alerte si le filtre retourne peu de données.
- Graphiques avec labels raccourcis, tooltips complets, axes en euros ou k€ selon les montants.
- Page détail dataset avec aperçu paginé, recherche, tri, types lisibles, valeurs manquantes, doublons et score qualité avant/après nettoyage.
- Exports : CSV nettoyé, Excel `.xlsx` avec onglets de synthèse, PDF de rapport.
- Page Prédictions avec prévision du chiffre d'affaires sur 3 mois, score de confiance, fourchette basse/haute et mois anormaux expliqués.
- Page Alertes avec statut : nouveau, lu, résolu.
- Assistant IA optionnel OpenAI avec fallback local intelligent en français.
- Catalogue KPI avec formule et description métier de chaque indicateur.
- Profil entreprise.

## Filtres BI

Les filtres disponibles sur le dashboard sont :

- période : date de début et date de fin ;
- ville ;
- canal ;
- client ;
- produit ;
- vendeur.

Après application, les KPI, graphiques, insights et alertes sont recalculés sur le sous-ensemble filtré. L'interface affiche le nombre de lignes filtrées par rapport au total pour aider à interpréter les résultats.

## Exports

L'application propose plusieurs exports utiles pour un usage BI :

- CSV nettoyé : données prêtes à réutiliser dans Excel, Power BI ou Python ;
- Excel `.xlsx` : données nettoyées + résumé + top clients + top produits ;
- PDF : rapport synthétique avec KPI, top clients et insights.

Le fichier Excel est téléchargé avec une vraie extension `.xlsx`, le type MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` et un nom clair comme `datapilot_pme_ventes_filtrees.xlsx`.

## Page Détail dataset

La page détail dataset permet de contrôler la qualité des données importées :

- aperçu des 20 premières lignes ;
- recherche, tri et pagination dans l'aperçu ;
- dates affichées au format français ;
- types de colonnes lisibles : Texte, Nombre décimal, Nombre entier, Date ;
- valeurs manquantes par colonne ;
- doublons ;
- score qualité avant et après nettoyage ;
- téléchargement des données nettoyées.

## Page Prédictions

La page Prédictions ajoute une dimension Data Science au projet :

- prévision du chiffre d'affaires sur 3 mois ;
- méthode expliquée : régression linéaire sur l'historique mensuel ;
- score de confiance calculé à partir de l'erreur historique ;
- fourchette basse et haute pour chaque mois prévu ;
- tendance : hausse, baisse ou stable ;
- détection des mois anormaux avec explication métier ;
- message clair si les données ne sont pas suffisantes.

## Assistant IA

OpenAI est optionnel. Si `OPENAI_API_KEY` est vide, l'assistant utilise un fallback local basé sur les données importées.

Exemples de questions :

- Quels sont mes meilleurs clients ?
- Quels sont mes meilleurs produits ?
- Quel canal génère le plus de chiffre d'affaires ?
- Quelle ville est la plus performante ?
- Quel vendeur est le plus performant ?
- Le chiffre d'affaires est-il en baisse ?
- Fais-moi un résumé du mois.
- Propose-moi 3 actions commerciales.

## Catalogue KPI

Le catalogue documente les principaux indicateurs :

- Chiffre d'affaires = `somme(chiffre_affaires)` ;
- Marge = `somme(marge)` ;
- Taux de marge = `marge / chiffre d'affaires` ;
- Panier moyen = `chiffre d'affaires / nombre de commandes` ;
- Taux de paiement = `commandes payées / total commandes` ;
- Meilleure ville = `groupby(ville).somme(chiffre_affaires).top(1)` ;
- Meilleur canal = `groupby(canal).somme(chiffre_affaires).top(1)` ;
- Meilleur vendeur = `groupby(vendeur).somme(chiffre_affaires).top(1)`.

## Stack technique

### Frontend

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL en Docker, SQLite possible en local
- Pandas / OpenPyXL
- Scikit-learn
- ReportLab
- JWT / bcrypt

### Déploiement local

- Docker Compose
- Services : frontend, backend, PostgreSQL

## Lancement avec Docker

```bash
cp .env.example .env
docker compose up --build
```

URLs :

- Frontend : http://localhost:3000
- API : http://localhost:8000
- Documentation API : http://localhost:8000/docs
- PostgreSQL : localhost:5432

## Lancement local sans Docker

```powershell
.\launch.ps1 -Mode local-all
```

Ou séparément :

```powershell
.\launch.ps1 -Mode local-backend
.\launch.ps1 -Mode local-frontend
```

Le mode local garde les dépendances et caches dans le dossier du projet sur `E:` quand il est lancé depuis ce workspace.

## Variables d'environnement

Voir `.env.example` :

- `DB_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `OPENAI_API_KEY`
- `UPLOAD_DIR`
- `ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_URL`

## Données de démonstration

Un fichier CSV d'exemple est disponible dans `samples/sample_sales.csv`. Vous pouvez aussi importer un fichier Excel de ventes avec des colonnes comme : date, client, produit, chiffre_affaires, marge, ville, canal, vendeur, statut_paiement.

## Captures à ajouter au portfolio

- Dashboard KPI avec filtres ouverts.
- Graphique Top clients / Top produits.
- Page Détail dataset avec score qualité.
- Page Prédictions avec fourchette basse/haute.
- Page Alertes avec statuts.
- Réponse assistant IA avec top clients.
- Export PDF du rapport.
- Catalogue KPI.

## Phrase CV

> Développement d'une application SaaS BI full-stack pour PME avec import Excel/CSV, nettoyage automatisé, dashboard interactif filtrable, assistant IA avec fallback local, prédictions de chiffre d'affaires et exports PDF/Excel.


## Phrase LinkedIn

> J'ai développé DataPilot PME, une plateforme BI automatisée pour PME qui transforme des fichiers Excel/CSV en dashboards interactifs, analyses qualité, prédictions de chiffre d'affaires, exports PDF/Excel et recommandations métier assistées par IA.

## Améliorations futures

- Ajouter une gestion multi-utilisateurs avancée avec rôles et permissions.
- Ajouter des connecteurs directs vers Google Sheets, CRM et bases SQL.
- Ajouter des dashboards personnalisables par glisser-déposer.
- Ajouter des tests automatisés end-to-end avec Playwright.
- Ajouter un système de notifications email pour les alertes critiques.
- Ajouter un déploiement cloud avec stockage objet pour les fichiers importés.

## Structure

```text
backend/   API FastAPI, modèles, services data/IA, routes fichiers et exports
frontend/  Application Next.js, dashboard, pages BI, composants UI
samples/   Données de démonstration
docker-compose.yml
launch.ps1
```

## Notes production

Avant une mise en production :

- remplacer `SECRET_KEY` par une valeur forte ;
- utiliser PostgreSQL managé ;
- configurer HTTPS et CORS strict ;
- stocker les uploads dans un stockage objet ;
- ajouter des migrations Alembic ;
- ajouter une suite de tests automatisés.