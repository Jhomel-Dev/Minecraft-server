#!/bin/bash
echo "=========================================="
echo "    Instalando CraftControl Agent         "
echo "=========================================="

if ! command -v unzip &> /dev/null; then
    echo "Error: 'unzip' no está instalado. Instálalo con 'sudo apt install unzip' y vuelve a intentar."
    exit 1
fi

DOC_DIR="$HOME"
if [ -d "$HOME/Documentos" ]; then DOC_DIR="$HOME/Documentos"; fi
if [ -d "$HOME/Documents" ]; then DOC_DIR="$HOME/Documents"; fi

INSTALL_DIR="$DOC_DIR/CraftControlAgent"
echo "Instalando en: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR" || exit 1

if ! command -v node &> /dev/null; then
    echo "Node.js no detectado. Descargando versión portable (v20)..."
    curl -sL -o node.tar.xz https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz
    tar -xf node.tar.xz
    export PATH="$PWD/node-v20.11.1-linux-x64/bin:$PATH"
fi

if [ ! -f "index.js" ]; then
    echo "Descargando código del Agente..."
    # TODO: Cambiar esta URL al lugar oficial donde alojes el ZIP (ej. GitHub Releases o AWS S3)
    curl -sL -o agent.zip "https://github.com/Jhomel-Dev/Minecraft-server/releases/download/v1.1.0/craft-control-agent-full.zip"
    echo "Extrayendo Agente..."
    unzip -q agent.zip
    rm agent.zip
fi

echo "Iniciando configuración y vinculación inicial..."
node index.js --setup

if [ $? -ne 0 ]; then
    echo "Error o cancelación durante la vinculación."
    exit 1
fi

echo "Configurando persistencia en segundo plano (cron)..."
# Eliminar posibles cronjobs anteriores del agente para evitar duplicados
crontab -l 2>/dev/null | grep -v "CraftControlAgent" | crontab -
# Agregar cronjob de auto-inicio
crontab -l 2>/dev/null | { cat; echo "@reboot cd '$INSTALL_DIR' && nohup node index.js > agent.log 2>&1 & # CraftControlAgent"; } | crontab -

echo "Arrancando Agente en segundo plano por primera vez..."
nohup node index.js > agent.log 2>&1 &

echo "Creando accesos directos en el Escritorio..."
DESKTOP_DIR="$HOME/Escritorio"
if [ ! -d "$DESKTOP_DIR" ]; then DESKTOP_DIR="$HOME/Desktop"; fi
if [ -d "$DESKTOP_DIR" ]; then
    cat <<EOF > "$DESKTOP_DIR/Reiniciar_Agente.desktop"
[Desktop Entry]
Name=Reiniciar CraftControl
Exec=bash -c "pkill -f 'node index.js'; cd '$INSTALL_DIR' && nohup node index.js > agent.log 2>&1 &"
Terminal=true
Type=Application
EOF
    chmod +x "$DESKTOP_DIR/Reiniciar_Agente.desktop"

    cat <<EOF > "$DESKTOP_DIR/Logs_Agente.desktop"
[Desktop Entry]
Name=Logs CraftControl
Exec=bash -c "cd '$INSTALL_DIR' && tail -f agent.log"
Terminal=true
Type=Application
EOF
    chmod +x "$DESKTOP_DIR/Logs_Agente.desktop"
fi

echo "=========================================="
echo " ✅ ¡Instalación Completada con Éxito!    "
echo " El agente ahora corre invisible en el    "
echo " fondo y sobrevivirá a reinicios.         "
echo " Puedes cerrar esta terminal con confianza."
echo "=========================================="
