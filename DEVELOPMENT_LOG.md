# Development Log

## Feature: Local Agent - Docker Management
- **Status:** Completed
- **Details:** 
  - Inicialización del proyecto Node.js (`Minecraft-Server-Manager-LocalAgent`).
  - Instalación de la dependencia `dockerode`.
  - Creación del archivo `RULES.md` en la raíz para asentar normas de Clean Code (sin comentarios, early returns, commits pequeños).
  - Creación de `DockerService.js`.
  - Implementación de métodos para validar configuración, descargar la imagen de `itzg/minecraft-server` y crear el contenedor con enlace al puerto 25565 y volumen local.

## Feature: Local Agent - Playit.gg Tunneling
- **Status:** In Progress
- **Details:**
  - Planificando la integración de Playit.gg mediante procesos hijo (Child Process).
  - Creación de `TunnelService.js` para ejecutar el binario de playit.
  - Implementación de Event Emitters para capturar el link de "claim" (si el usuario es nuevo) y la dirección pública y puerto asignados.
  - Se espera que el sistema operativo tenga instalado el binario de `playit`, o en su defecto se enviará como paquete posteriormente.
