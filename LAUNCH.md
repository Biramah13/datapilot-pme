# DataPilot PME — Guide de Lancement

SaaS complet pour l'import, nettoyage et analyse de données Excel/CSV avec BI dashboard, KPI, insights IA et alertes.

---

## 🚀 Lancement Rapide

### Option 1 : Docker Compose (Recommandé)
Parfait pour une exécution isolée et une déploiement rapide.

**Prérequis** : Docker Desktop pour Windows/Mac/Linux

**Étapes** :
```powershell
# 1. Naviguez vers le répertoire du projet
cd E:\LYON Msc2\Projet Perso\DPM

# 2. Créez le fichier .env (s'il n'existe pas)
# Si .env existe déjà, vous pouvez passer cette étape
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}

# 3. Construisez et démarrez les services
docker compose up --build

# Attendez que tous les services démarrent (2-3 minutes la première fois)
# Logs attendus : "Uvicorn running on ...", "started Server process"
```

**Accès** :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- API Health : http://localhost:8000/health

**Arrêt** :
```powershell
docker compose down
# Pour supprimer les volumes (données DB) :
docker compose down -v
```

---

### Option 2 : Exécution Locale (dev)
Pour développer et tester sans Docker.

**Prérequis** : Python 3.11+, Node.js 18+, npm

#### Backend (FastAPI)
```powershell
# 1. Ouvrez un terminal PowerShell à la racine du projet
cd E:\LYON Msc2\Projet Perso\DPM

# 2. Créez et activez le venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Installez les dépendances
pip install --upgrade pip
pip install -r backend\requirements.txt

# 4. Démarrez le backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Le backend tourne sur http://localhost:8000
# Health check : curl.exe http://localhost:8000/health
```

#### Frontend (Next.js)
Dans un **nouveau terminal** PowerShell :
```powershell
# 1. Naviguez au projet
cd E:\LYON Msc2\Projet Perso\DPM\frontend

# 2. Installez les dépendances
npm install

# 3. Démarrez le serveur de développement
npm run dev

# Le frontend tourne sur http://localhost:3000
```

**Accès** :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000

---

## 🛠️ Configuration

### Fichier `.env`
La plupart des settings par défaut fonctionnent, mais vous pouvez personnaliser :

```
# DB
DB_URL=postgresql+psycopg://postgres:postgres@db:5432/datapilot

# Auth
SECRET_KEY=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# OpenAI (optionnel — laissez vide pour assistant heuristique)
OPENAI_API_KEY=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Uploads
UPLOAD_DIR=/app/uploads
```

---

## ✅ Vérification Rapide

Après le lancement, testez les endpoints clés :

```powershell
# Health check du backend
curl.exe http://localhost:8000/health

# Test de frontend
curl.exe http://localhost:3000

# Inspecter les logs Docker
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

---

## 🐛 Dépannage

### Erreur : "docker" non reconnu
→ Installez Docker Desktop (https://www.docker.com/get-started)  
→ Redémarrez PowerShell après installation

### Erreur : `ModuleNotFoundError: bcrypt._bcrypt`
→ Réinstallez bcrypt dans le venv :
```powershell
pip uninstall -y bcrypt
pip install bcrypt==4.0.1
```

### Erreur : "Permission denied" sur .venv
→ Recréez le venv en administrateur :
```powershell
Remove-Item -Recurse -Force .venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Port 3000 / 8000 déjà utilisé
→ Arrêtez les processus qui utilisent ces ports ou changez le port dans la commande :
```powershell
# Backend sur 8001
uvicorn app.main:app --port 8001

# Frontend sur 3001
npm run dev -- -p 3001
```

### PostgreSQL ne démarre pas (Docker)
→ Vérifiez les logs :
```powershell
docker compose logs db
```
→ Supprimez les volumes orphelins :
```powershell
docker compose down -v
docker compose up --build
```

---

## 📦 Flux Utilisateur

1. **Inscription/Connexion** : Créez un compte sur `/register` ou connectez-vous sur `/login`
2. **Import de fichier** : Uploadez un CSV/Excel sur le dashboard
3. **Analyse automatique** : Le système nettoie, calcule les KPI, insights et alertes
4. **Dashboard** : Consultez les graphiques, KPI et insights générés
5. **Assistant IA** : Posez des questions sur vos données (nécessite `OPENAI_API_KEY` pour OpenAI)
6. **Profil** : Gérez les infos de votre entreprise

---

## 📊 Exemple de Données de Test

Un fichier `samples/sample_sales.csv` est inclus (220 lignes) avec des ventes simulées.  
Vous pouvez l'utiliser pour tester l'import et l'analyse.

---

## 🚀 Production

Pour un déploiement production :
1. Changez `SECRET_KEY` dans `.env` par une clé forte
2. Définissez `OPENAI_API_KEY` si vous utilisez l'assistant OpenAI
3. Configurez une vraie DB PostgreSQL (ne pas utiliser les crédentials par défaut)
4. Utilisez `docker compose -f docker-compose.prod.yml up` (si disponible) ou adaptez le compose actuel

---

## 📧 Support

Si vous rencontrez des erreurs :
1. Consultez les logs : `docker compose logs -f`
2. Vérifiez les ports : `netstat -ano | findstr :3000` (Windows) / `lsof -i :3000` (Mac/Linux)
3. Assurez-vous que les fichiers `.env` et `docker-compose.yml` sont présents
