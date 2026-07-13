#!/bin/bash
echo "=========================================="
echo "    Instalando CraftControl Agent         "
echo "=========================================="

# Comprobar unzip
if ! command -v unzip &> /dev/null; then
    echo "Error: 'unzip' no está instalado. Instálalo con 'sudo apt install unzip' y vuelve a intentar."
    exit 1
fi

# Descargar Node.js si no existe
if ! command -v node &> /dev/null; then
    echo "Node.js no detectado. Descargando versión portable (v20)..."
    curl -sL -o node.tar.xz https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz
    tar -xf node.tar.xz
    export PATH="$PWD/node-v20.11.1-linux-x64/bin:$PATH"
fi

# Descargar Agente si no existe
if [ ! -d "craft-control-agent" ]; then
    echo "Descargando código del Agente..."
    # Asumimos que el script está en la misma URL base que el zip
    BASE_URL=$(echo "$1" | sed 's|/install-linux.sh||')
    if [ -z "$BASE_URL" ]; then
        echo "Por favor, especifica la URL de tu panel como argumento."
        exit 1
    fi
    curl -sL -o agent.zip "$BASE_URL/craft-control-agent-full.zip"
    echo "Extrayendo Agente..."
    unzip -q agent.zip -d craft-control-agent
    rm agent.zip
fi

cd craft-control-agent
echo "Iniciando Agente..."
node index.js
