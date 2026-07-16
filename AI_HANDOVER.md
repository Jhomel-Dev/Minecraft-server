# 🧠 CraftControl - AI Context Handover

Este documento contiene todo el contexto, arquitectura, decisiones críticas y reglas de diseño del proyecto **CraftControl**. Su propósito es servir como "memoria" al iniciar una nueva sesión con una IA, permitiéndole asimilar el estado del proyecto de forma instantánea sin necesitar el historial del chat anterior.

---

## 📌 1. Visión General del Proyecto
**CraftControl** es un sistema integral para el despliegue, gestión y exposición a internet de servidores de Minecraft. Su principal atractivo es ser **zero-friction**: instala servidores con un clic (resolviendo dependencias de Java mágicamente) y los expone a internet sin necesidad de abrir puertos (port-forwarding) gracias a túneles TCP dinámicos.

---

## 🏗️ 2. Arquitectura del Sistema (3 Módulos)
El código está estrictamente desacoplado en tres componentes, cada uno en su propia carpeta en la raíz del repositorio:

### A. `Minecraft-Server-Manager-Web` (Frontend Dashboard)
- **Stack:** Next.js, React, CSS Vanilla.
- **Responsabilidad:** Interfaz de usuario. Consumo de API REST para operaciones CRUD y Auth, y Polling para actualización en tiempo real de métricas y estados.
- **Autenticación:** Envío de credenciales seguras (cookies) en los fetch (`credentials: 'include'`). Intercepción global para renovar el Access Token automáticamente (Refresh Token Flow) cuando hay error `401`.

### B. `Minecraft-Server-Manager-Api` (Backend Central)
- **Stack:** Node.js, Express, Prisma (SQLite), Socket.io.
- **Responsabilidad:** Corazón de la lógica de negocio y seguridad. Provee los endpoints REST y actúa como orquestador central WebSocket.
- **Quirks/Decisiones clave:**
  - El servidor HTTP (`server.js`) NO está forzado a `0.0.0.0` para permitir que el SO (especialmente Windows) asigne tanto IPv4 como IPv6, resolviendo problemas de CORS con `localhost` vs `::1`.
  - **Auth Flow:** Sistema JWT doble. Las sesiones concurrentes fallaban al renovar el token al mismo tiempo; esto se resolvió manteniendo constante el mismo `RefreshToken` durante la rotación si la sesión sigue activa.

### C. `Minecraft-Server-Manager-LocalAgent` (Daemon / Músculo)
- **Stack:** Node.js, Socket.io-client.
- **Responsabilidad:** Se instala en la máquina host. Se conecta al API vía WebSockets. Gestiona el sistema de archivos local, despliega los `.jar`, y streamea la consola (stdout/stderr).
- **Motores Soportados:** Vanilla, Paper, Purpur, Fabric, Forge y NeoForge.
- **Túneles (`TunnelService`):** Implementa `bore` para exponer puertos. Usa código nativo multiplataforma (en Windows descarga el `.zip` y extrae con PowerShell `Expand-Archive`; en Linux/Mac usa `.tar.gz` con `tar -xz`).
- **Arguments (Forge/Neo):** Evalúa dinámicamente el SO (`isWin`) para inyectar `win_args.txt` en Windows o `unix_args.txt` en sistemas Unix, evitando crasheos nativos.
- **Graceful Shutdown:** Si el socket se desconecta bruscamente (`Ctrl+C`), silencia los envíos de logs finales (`ConnectionService.verifyConnection`) para evitar excepciones no controladas en terminal.

---

## 🛑 3. Reglas Estrictas de Desarrollo (Obligatorias)

1. **Flujo de Git (Cero Commits):** La IA **NO DEBE** ejecutar `git commit` bajo ninguna circunstancia a menos que el usuario lo solicite expresamente de forma directa. La IA solo modificará los archivos locales e instruirá al usuario para que él revise y decida subir el código.
2. **Clean Code Absoluto:** El código no debe contener comentarios en absoluto (salvo en archivos de configuración como `.env.example`). Se debe usar *early returns* (cláusulas de guarda) para evitar el anidamiento excesivo de sentencias `if`. El código debe ser completamente autodescriptivo.
3. **Estética "Akira" / Diseño UI:** Para el desarrollo de interfaz, el diseño debe ser premium, altamente profesional, y muy serio.
   - Tonos base súper oscuros (e.g. `#0d0d0d`).
   - Acentos en colores neón/rojos brillantes (e.g. `#e52424`).
   - Nada de colores pastel ni de "plantillas baratas". Las interfaces deben impresionar (glassmorphism sutil, transiciones limpias).
   - **Prohibido:** El uso de Emojis de IA tipo "🚀, ✨, 🛠️" en la documentación externa (como el README principal) para mantener profesionalismo absoluto.

---

## 🚦 4. Estado Actual (Versión 1.1.1)
El proyecto se encuentra funcional, multiplataforma y estable. Se ha publicado oficialmente la versión **MVP `1.1.1`**. A partir de este punto, el enfoque está en escalar nuevas features (soporte Docker, mods dinámicos, etc.) basándose sólidamente en esta arquitectura.

> **INSTRUCCIÓN PARA LA IA QUE LEE ESTO:**
> Asimila este documento de inmediato. Confirma al usuario que has entendido la arquitectura en 3 módulos, el flujo multiplataforma de Agent y las reglas de cero commits y clean code. Pregunta directamente cuál es la siguiente feature a desarrollar.
