@echo off
echo ===================================================
echo             Iniciando CraftControl...
echo ===================================================

echo [1/3] Iniciando la API Central...
cd Minecraft-Server-Manager-Api
start "CraftControl - API" cmd /k "npm run dev"
cd ..

echo [2/3] Iniciando el Web Dashboard (Next.js)...
cd Minecraft-Server-Manager-Web
start "CraftControl - Web" cmd /k "npm run dev"
cd ..

echo [3/3] Iniciando el Local Agent...
cd Minecraft-Server-Manager-LocalAgent
start "CraftControl - Agent" cmd /k "npm start"
cd ..

echo.
echo ===================================================
echo  ¡Todos los modulos se estan ejecutando!
echo  Revisa las nuevas ventanas que se han abierto.
echo  Dashboard disponible en: http://localhost:3000
echo ===================================================
pause
