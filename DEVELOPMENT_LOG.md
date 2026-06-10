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
- **Status:** Completed
- **Details:**
  - Instalación de `@prisma/client` y `prisma`.
  - Inicialización de Prisma (`prisma init`).
  - Creación del archivo `schema.prisma` definiendo los modelos `User` (Jugador) y `Server` (Servidor de Minecraft).
  - Configuración de la URL de conexión en `.env.example`.

## Feature: Cloud API - User Authentication
- **Status:** Completed
- **Details:**
  - Instalación de dependencias: `bcryptjs`, `jsonwebtoken` y `vitest`.
  - Implementación de `AuthService.js` manejando registro (hashing) y login (emisión de JWT).
  - Integración con Prisma Client.
  - Pruebas unitarias completas en `AuthService.test.js`.

## Feature: Cloud API - Server Management Service
- **Status:** Completed
- **Details:**
  - Implementación de `ServerService.js`.
  - Método `createServer` que guarda la configuración del servidor en Prisma.
  - Método `startServer` que cambia el estado a STARTING y emite el evento `START_SERVER` vía Socket.io al Agente Local.
  - Método `stopServer` que cambia el estado a STOPPING y emite `STOP_SERVER`.
  - Pruebas unitarias en `ServerService.test.js` mockeando el servidor WebSocket.

## Feature: Cloud API - Express Routes & Controllers
- **Status:** Completed
- **Details:**
  - Creación de `authMiddleware.js` para proteger rutas con JWT.
  - Creación de `AuthController.js` y `ServerController.js` para exponer los servicios vía HTTP.
  - Registro de las rutas `/api/auth` y `/api/servers` en el `index.js`.
  - Inyección de la instancia de `Socket.io` en Express (`app.set('io', io)`) para permitir a los controladores emitir eventos al Agente Local.

## Feature: Full Stack - Real-Time Console Logs
- **Status:** Completed
- **Details:**
  - **Local Agent:** `DockerService.js` ahora se acopla al stream de logs del contenedor Docker (stdout/stderr), limpia las cabeceras binarias y emite cada nueva línea de texto.
  - **Local Agent:** `LocalAgentController.js` atrapa estos logs y los envía al Cloud API bajo el evento `SERVER_LOG` etiquetados con su `serverId`.
  - **Cloud API:** `socket-handler-services.js` fue refactorizado para aceptar tanto WebSockets de Agentes como WebSockets del Frontend (autenticados con JWT).
  - **Cloud API:** Cuando el Frontend se conecta a la vista de consola, se une a un "Room" (`JOIN_SERVER_CONSOLE`). Cualquier log que envíe el Agente, el API lo retransmite (`broadcast.to(room)`) al milisegundo directamente a la pantalla del usuario (`CONSOLE_LOG`).
