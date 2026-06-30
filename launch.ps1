param(
    [ValidateSet("docker", "local-backend", "local-frontend", "local-all")]
    [string]$Mode = "docker",
    [switch]$Help
)

if ($Help) {
    Write-Host "DataPilot PME - Launch Helper"
    Write-Host ""
    Write-Host "Usage: .\launch.ps1 -Mode <mode>"
    Write-Host ""
    Write-Host "Modes disponibles:"
    Write-Host "  docker          Lancer avec Docker Compose"
    Write-Host "  local-backend   Lancer seulement le backend localement"
    Write-Host "  local-frontend  Lancer seulement le frontend localement"
    Write-Host "  local-all       Lancer backend + frontend localement"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\launch.ps1"
    Write-Host "  .\launch.ps1 -Mode docker"
    Write-Host "  .\launch.ps1 -Mode local-all"
    exit 0
}

$ProjectRoot = (Get-Location).Path
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$UploadDir = Join-Path $BackendDir "uploads"
$PipCacheDir = Join-Path $ProjectRoot ".cache\pip"
$NpmCacheDir = Join-Path $ProjectRoot ".cache\npm"
$BackendDbPath = (Join-Path $BackendDir "datapilot.db") -replace "\\", "/"
$LocalDbUrl = "sqlite:///$BackendDbPath"
$LocalOrigins = "http://localhost:3000,http://127.0.0.1:3000"

function Ensure-EnvFile {
    if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
        if (Test-Path (Join-Path $ProjectRoot ".env.example")) {
            Copy-Item (Join-Path $ProjectRoot ".env.example") (Join-Path $ProjectRoot ".env")
        } else {
            Write-Host "Missing .env.example" -ForegroundColor Red
            exit 1
        }
    }
}

function Prepare-BackendEnv {
    New-Item -ItemType Directory -Force -Path $UploadDir, $PipCacheDir | Out-Null
    $env:DB_URL = $LocalDbUrl
    $env:UPLOAD_DIR = $UploadDir
    $env:ALLOWED_ORIGINS = $LocalOrigins
    $env:PIP_CACHE_DIR = $PipCacheDir
}

function Prepare-FrontendEnv {
    New-Item -ItemType Directory -Force -Path $NpmCacheDir | Out-Null
    $env:npm_config_cache = $NpmCacheDir
    $env:NEXT_PUBLIC_API_URL = "http://localhost:8000"
}

Write-Host "DataPilot PME - Launcher" -ForegroundColor Yellow
Write-Host "Mode: $Mode" -ForegroundColor Green
Ensure-EnvFile

if ($Mode -eq "docker") {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Docker is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    docker compose up --build
}
elseif ($Mode -eq "local-backend") {
    if (-not (Test-Path (Join-Path $ProjectRoot ".venv"))) {
        python -m venv (Join-Path $ProjectRoot ".venv")
    }
    & (Join-Path $ProjectRoot ".venv\Scripts\Activate.ps1")
    pip install --upgrade pip -q
    pip install -r (Join-Path $BackendDir "requirements.txt") -q
    Prepare-BackendEnv
    Set-Location $BackendDir
    uvicorn app.main:app --host 127.0.0.1 --port 8000
}
elseif ($Mode -eq "local-frontend") {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    Prepare-FrontendEnv
    Set-Location $FrontendDir
    npm install
    npm run dev -- --hostname 127.0.0.1 --port 3000
}
elseif ($Mode -eq "local-all") {
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $ProjectRoot "launch.ps1"), "-Mode", "local-backend"
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    Prepare-FrontendEnv
    Set-Location $FrontendDir
    npm install
    npm run dev -- --hostname 127.0.0.1 --port 3000
}
else {
    Write-Host "Unknown mode: $Mode" -ForegroundColor Red
    exit 1
}