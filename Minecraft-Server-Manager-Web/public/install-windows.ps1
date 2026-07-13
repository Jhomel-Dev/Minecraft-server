$ErrorActionPreference = "Stop"
Write-Host "=========================================="
Write-Host "    Instalando CraftControl Agent         "
Write-Host "=========================================="

# Check for Node.js
$NodeInstalled = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $NodeInstalled) {
    Write-Host "Node.js no detectado. Descargando versión portable (v20)..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" -OutFile "node.zip"
    Write-Host "Extrayendo Node.js..."
    Expand-Archive -Path "node.zip" -DestinationPath "." -Force
    Remove-Item "node.zip"
    $env:Path = "$PWD\node-v20.11.1-win-x64;$env:Path"
}

if (-not (Test-Path "craft-control-agent")) {
    Write-Host "Descargando código del Agente..."
    $BaseUrl = $args[0]
    if (-not $BaseUrl) {
        Write-Host "Por favor, especifica la URL base como argumento."
        exit
    }
    Invoke-WebRequest -Uri "$BaseUrl/craft-control-agent-full.zip" -OutFile "agent.zip"
    Write-Host "Extrayendo Agente..."
    Expand-Archive -Path "agent.zip" -DestinationPath "craft-control-agent" -Force
    Remove-Item "agent.zip"
}

Set-Location "craft-control-agent"
Write-Host "Iniciando Agente..."
node index.js
