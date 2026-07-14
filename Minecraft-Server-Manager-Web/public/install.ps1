$ErrorActionPreference = "Stop"
Write-Host "=========================================="
Write-Host "    Instalando CraftControl Agent         "
Write-Host "=========================================="

$DocDir = [Environment]::GetFolderPath("MyDocuments")
$InstallDir = Join-Path $DocDir "CraftControlAgent"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}
Write-Host "Instalando en: $InstallDir"
Set-Location $InstallDir

$NodeInstalled = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $NodeInstalled) {
    Write-Host "Node.js no detectado. Descargando versión portable (v20)..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" -OutFile "node.zip"
    Write-Host "Extrayendo Node.js..."
    Expand-Archive -Path "node.zip" -DestinationPath "." -Force
    Remove-Item "node.zip"
    $env:Path = "$PWD\node-v20.11.1-win-x64;$env:Path"
}

if (-not (Test-Path "index.js")) {
    Write-Host "Descargando código del Agente..."
    Invoke-WebRequest -Uri "https://craftcontrol.vercel.app/craft-control-agent-full.zip" -OutFile "agent.zip"
    Write-Host "Extrayendo Agente..."
    Expand-Archive -Path "agent.zip" -DestinationPath "." -Force
    Remove-Item "agent.zip"
}

Write-Host "Iniciando Agente..."
node index.js
