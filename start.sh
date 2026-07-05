#!/bin/bash

echo "==================================================="
echo "            Iniciando CraftControl...              "
echo "==================================================="

echo "[1/3] Iniciando la API Central..."
cd Minecraft-Server-Manager-Api && npm run dev &
API_PID=$!

echo "[2/3] Iniciando el Web Dashboard (Next.js)..."
cd Minecraft-Server-Manager-Web && npm run dev &
WEB_PID=$!

echo "[3/3] Iniciando el Local Agent..."
cd Minecraft-Server-Manager-LocalAgent && npm start &
AGENT_PID=$!

echo ""
echo "==================================================="
echo " ¡Todos los modulos se estan ejecutando en 2do plano!"
echo " Dashboard disponible en: http://localhost:3000"
echo " Presiona CTRL+C para detener todos los modulos."
echo "==================================================="

# Esperar a que el usuario presione Ctrl+C para matar los procesos
trap "echo 'Deteniendo CraftControl...'; kill $API_PID $WEB_PID $AGENT_PID; exit" SIGINT SIGTERM

wait
