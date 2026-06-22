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

## Feature: Web UI - Blocky Theme & Navigation
- **Status:** Completed
- **Details:**
  - Implementación de un diseño estético "Voxel/Blocky" inspirado en la UI de Minecraft.
  - Creación de sistema de temas (Overworld Mode y The End Mode).
  - Creación de Landing Page (`Landing.jsx`) con información de producto y flujo hacia Login.
  - Sidebar interactivo en el Dashboard con links para Files, Mods, Backups y Settings.
  - Integración de avatares automáticos usando Pixel Art (DiceBear) basados en el nombre de usuario.

## Feature: Full Stack - Authentication SystemA
- **Status:** Completed
- **Details:**
  - **Base de Datos:** Migración local a SQLite para simplificar el desarrollo (`dev.db`). Actualización de esquema con `googleId` y `refreshToken`.
  - **Google OAuth:** Integración completa de `@react-oauth/google` en el Frontend y `google-auth-library` en el API para verificar tokens de manera segura.
  - **Traditional Auth:** Formularios estándar de inicio de sesión y registro. Manejo seguro de contraseñas inexistentes (para usuarios creados vía Google).
  - **Refresh Tokens:** Implementación de flujo seguro de sesiones. Emisión de `accessToken` (body) y `refreshToken` (cookie httpOnly). Endpoint para auto-login al recargar la app.

## Feature: Full Stack - Server Console Input
- **Status:** Completed
- **Details:**
  - **Web UI:** Se añadió estado en React (`commandInput`) y evento `onKeyDown` para detectar la tecla Enter y emitir el evento WebSocket `SEND_COMMAND`.
  - **Cloud API:** Se actualizó `socket-handler-services.js` para recibir `SEND_COMMAND` de clientes y retransmitirlo a los Agentes Locales.
  - **Local Agent:** Se actualizó `ConnectionService.js` y `LocalAgentController.js` para escuchar el nuevo evento y pasarlo al contenedor Docker.
  - **Local Agent:** Se añadió `sendCommand` en `DockerService.js` para ejecutar de manera segura comandos en el servidor Minecraft vía `rcon-cli` usando Docker Exec API.

## Feature: Full Stack - File Manager
- **Status:** Completed
- **Details:**
  - **Local Agent:** Creación de `FileService.js` que se encarga de las operaciones del sistema de archivos (`list`, `read`, `write`, `delete`) garantizando que todas las rutas sean seguras y no escapen del directorio del servidor (`path traversal prevention`).
  - **Local Agent:** `ConnectionService.js` ahora expone el listener `FS_OPERATION` soportando ACKs de Socket.io.
  - **Cloud API:** Nuevo endpoint en `ServerController.js` (`POST /api/servers/:id/fs`) que enruta peticiones HTTP como peticiones de Socket hacia el Agente Local correspondiente, esperando su respuesta.
  - **Web UI:** Se creó el componente `FileManager.jsx` con interfaz tipo explorador, permitiendo navegación de directorios, visualización de tamaños, eliminación, edición de texto y guardado en tiempo real.

## Feature: Native Server Migration (Zero-Copy Architecture)
- **Status:** Completed
- **Details:**
  - **Local Agent:** Migración de contenedores Docker a procesos nativos (Java) mediante `NativeServerService.js`.
  - **Local Agent:** Implementación de arquitectura Zero-Copy centralizando los `.jar` en un Vault global (`C:\CraftControl\Vault\JARs`) para ahorro de espacio.
  - **Cloud API:** Adaptación de las rutas para soportar la ejecución nativa y descarga automática de versiones.

## Feature: Web UI - Tailwind CSS Migration
- **Status:** Completed
- **Details:**
  - Refactorización masiva de estilos desde CSS tradicional hacia Tailwind CSS.
  - Implementación del patrón Singleton en los servicios de API y Servidor para evitar instancias redundantes.
  - Reestructuración del layout clásico en el Dashboard (controles a la izquierda, consola completa a la derecha).
  - Corrección de la carga útil del inicio de sesión de Google (de `token` a `credential`).

## Feature: Full Stack - User Profile Section
- **Status:** Completed
- **Details:**
  - **Cloud API:** Creación de `UserController.js` y `userRoutes.js` para exponer el endpoint `PUT /api/users/profile`.
  - **Web UI:** Construcción de `ProfilePage.jsx` para visualizar el avatar, listado de servidores y resumen de respaldos.
  - **Web UI:** Integración de formulario in-line para cambio de nombre de usuario de forma segura con regeneración de token JWT en tiempo real.

## Feature: Full Stack - Console Logs Persistence
- **Status:** Completed
- **Details:**
  - **Cloud API:** Implementación de un búfer circular en memoria dentro de `socket-handler-services.js` para retener las últimas 200 líneas de consola por cada servidor.
  - **Cloud API:** Emisión del evento `CONSOLE_LOG_HISTORY` cuando un cliente se une a la sala de consola.
  - **Web UI:** Actualización de `DashboardPage.jsx` para precargar el historial, solucionando el borrado de logs al cambiar entre pestañas de la SPA.

## Feature: Core - Linux Zero-Copy Architecture & CORS
- **Status:** Completed
- **Details:**
  - **Local Agent:** Migración definitiva a Linux soportando el Vault de Zero-Copy.
  - **Cloud API:** Modificación de políticas CORS para admitir puertos de Next.js (`3000`, `3001`). Inyección de variables criptográficas (`JWT_SECRET`, `JWT_REFRESH_SECRET`) y el `GOOGLE_CLIENT_ID`.

## Feature: Web UI - Next.js Rebuild & FSD Pattern (Feature 1)
- **Status:** Completed
- **Details:**
  - Reconstrucción completa del frontend usando `Next.js 14+` (App Router).
  - Implementación de **Feature-Sliced Design (FSD)** asegurando un código limpio, aislado por dominios funcionales y reglas estrictas de Clean Code sin comentarios.
  - Soporte de temas duales avanzados: **Overworld Theme** (Light) y **Enderman Theme** (Dark) vía `next-themes` y `Tailwind CSS v4`.
  - Creación de rutas de Auth, integración de `@react-oauth/google` para inicio de sesión, y estructura base del `DashboardLayout` con menú lateral dinámico (`DashboardSidebar`).

## Feature: Web UI - Real-time Console Module (Feature 2)
- **Status:** Completed
- **Details:**
  - Creación del Custom Hook `useServerConsole.js` integrando `socket.io-client` y utilizando principios de Clean Code y Guard Clauses.
  - Creación de `ConsoleOutput.jsx` con auto-scroll a los logs más recientes.
  - Creación de `ConsoleInput.jsx` previniendo envíos vacíos.
  - Ensamblado final de la vista principal del Dashboard (`app/dashboard/[serverId]/page.js`) unificando autenticación y estado en tiempo real.
