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
    # TODO: Cambiar esta URL al lugar oficial donde alojes el ZIP (ej. GitHub Releases o AWS S3)
    Invoke-WebRequest -Uri "https://github.com/Jhomel-Dev/Minecraft-server/releases/download/release/v1.1.0/craft-control-agent-full.zip" -OutFile "agent.zip"
    Write-Host "Extrayendo Agente..."
    Expand-Archive -Path "agent.zip" -DestinationPath "." -Force
    Remove-Item "agent.zip"
}

Write-Host "Iniciando configuración y vinculación inicial..."
node index.js --setup

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error o cancelación durante la vinculación."
    exit
}

Write-Host "Configurando persistencia en segundo plano (Startup)..."
$StartupFolder = [Environment]::GetFolderPath("Startup")
$VbsPath = Join-Path $StartupFolder "CraftControlAgent.vbs"

$VbsContent = "Set WshShell = CreateObject(`"WScript.Shell`")`r`n"
$VbsContent += "WshShell.Run `"cmd /c cd `"" + $InstallDir + "`" && node index.js > agent.log 2>&1`", 0, False"
Set-Content -Path $VbsPath -Value $VbsContent -Encoding Ascii

Write-Host "Arrancando Agente en segundo plano por primera vez..."
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$VbsPath`""

Write-Host "Creando accesos directos en el Escritorio..."
$DesktopFolder = [Environment]::GetFolderPath("Desktop")

# Reiniciar_Agente.bat
$RestartBat = Join-Path $DesktopFolder "Reiniciar_Agente.bat"
$RestartContent = "@echo off`r`ntaskkill /F /IM node.exe >nul 2>&1`r`nwscript.exe `"" + $VbsPath + "`"`r`necho Agente CraftControl reiniciado correctamente.`r`ntimeout /t 3"
Set-Content -Path $RestartBat -Value $RestartContent -Encoding Ascii

# Ver_Logs_Agente.bat
$LogsBat = Join-Path $DesktopFolder "Ver_Logs_Agente.bat"
$LogsContent = "@echo off`r`ncd /d `"" + $InstallDir + "`"`r`npowershell -Command `"Get-Content agent.log -Wait -Tail 20`""
Set-Content -Path $LogsBat -Value $LogsContent -Encoding Ascii

Write-Host "=========================================="
Write-Host " ✅ ¡Instalación Completada con Éxito!    "
Write-Host " El agente ahora corre invisible en el    "
Write-Host " fondo y sobrevivirá a reinicios.         "
Write-Host " Puedes cerrar esta terminal con confianza."
Write-Host "=========================================="
