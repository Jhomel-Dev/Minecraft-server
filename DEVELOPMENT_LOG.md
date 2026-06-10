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
- **Status:** Completed
- **Details:**
  - Integración de Playit.gg mediante procesos hijo (Child Process).
  - Creación de `TunnelService.js` para ejecutar el binario de playit.
  - Implementación de Event Emitters para capturar el link de "claim" y la dirección asignada.
  - Implementación de pruebas unitarias (`TunnelService.test.js`) usando Jest.

## Feature: Local Agent - WebSocket Connection
- **Status:** Completed
- **Details:**
  - Instalación de `socket.io-client`.
  - Implementación de `ConnectionService.js` manejando autenticación y eventos.
  - Pruebas unitarias correspondientes en `ConnectionService.test.js`.

## Feature: Local Agent - Orchestrator (Controller)
- **Status:** Completed
- **Details:**
  - Implementación de `LocalAgentController.js` para coordinar los servicios.
  - El controlador une WebSockets, Docker y Tunnel de forma reactiva (event-driven).
  - Pruebas unitarias en `LocalAgentController.test.js` mockeando los tres servicios.

## Feature: Local Agent - Application Entry Point
- **Status:** Completed
- **Details:**
  - Instalación de `dotenv` para carga de configuración.
  - Creación de `index.js` como punto de arranque principal (`npm start`).
  - Creación de plantilla `.env.example`.

## Feature: Cloud API - Prisma ORM Setup
- **Status:** In Progress
- **Details:**
  - Instalación de `@prisma/client` y `prisma`.
  - Inicialización de Prisma (`prisma init`).
  - Creación del archivo `schema.prisma` definiendo los modelos `User` (Jugador) y `Server` (Servidor de Minecraft).
  - Configuración de la URL de conexión en `.env.example`.
