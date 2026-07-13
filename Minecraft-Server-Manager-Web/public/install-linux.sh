#!/bin/bash
echo "=========================================="
echo "    Instalando CraftControl Agent         "
echo "=========================================="

# Comprobar unzip
if ! command -v unzip &> /dev/null; then
    echo "Error: 'unzip' no está instalado. Instálalo con 'sudo apt install unzip' y vuelve a intentar."
    exit 1
fi

# Definir ruta de instalación estándar (Documentos)
if [ -d "$HOME/Documentos" ]; then
    DOC_DIR="$HOME/Documentos"
elif [ -d "$HOME/Documents" ]; then
    DOC_DIR="$HOME/Documents"
else
    DOC_DIR="$HOME"
fi

INSTALL_DIR="$DOC_DIR/CraftControlAgent"
echo "Instalando en: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR" || exit 1

# Descargar Node.js si no existe
if ! command -v node &> /dev/null; then
    echo "Node.js no detectado. Descargando versión portable (v20)..."
    curl -sL -o node.tar.xz https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz
    tar -xf node.tar.xz
    export PATH="$PWD/node-v20.11.1-linux-x64/bin:$PATH"
fi

if [ ! -f "index.js" ]; then
    echo "Descargando código del Agente..."
    # Asumimos que el script está en la misma URL base que el zip
    BASE_URL=$(echo "$1" | sed 's|/install-linux.sh||')
    if [ -z "$BASE_URL" ]; then
        echo "Por favor, especifica la URL de tu panel como argumento."
        exit 1
    fi
    curl -sL -o agent.zip "$BASE_URL/craft-control-agent-full.zip"
    echo "Extrayendo Agente..."
    unzip -q agent.zip
    rm agent.zip
fi

echo "Iniciando Agente..."
node index.js
