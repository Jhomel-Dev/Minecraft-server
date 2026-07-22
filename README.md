<div align="center">
  <h1>CraftControl</h1>
  <p>A highly automated, zero-friction web control panel and local agent for deploying and managing Minecraft servers.</p>

  <div>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  </div>
</div>

<br />

## Overview

CraftControl is a modern, modular Minecraft server management system. It abstracts away the complexities of server hosting, allowing you to deploy engines, expose ports to the internet, and manage configurations with a single click. 

## Features

- **Smart Native Deployment**: Automated installation and execution of Vanilla, Forge, NeoForge, Paper, Purpur, and Fabric servers. Java versions are matched automatically.
- **Zero-Friction Networking**: Built-in dynamic TCP tunneling (powered by `bore`). Your servers are instantly exposed securely without requiring router port-forwarding.
- **Real-Time Console**: Ultra-low latency log streaming via WebSockets directly to the web dashboard.
- **Advanced File Management**: Bulk upload plugins and mods, manage server worlds, and edit configuration files with built-in syntax highlighting.
- **Backup System**: One-click full server backups and seamless restoration.
- **Performance & Player Management**: Live CPU/RAM metrics, interactive whitelist configuration, and comprehensive player administration (Ban, Kick, OP).
- **Internationalization (i18n)**: Fully translated Web Dashboard supporting both English and Spanish out-of-the-box.
- **Interactive API Docs (Swagger)**: Built-in OpenAPI documentation available at `/api-docs` on the central API.
## Architecture

The project is structured into three highly decoupled modules to ensure scalability and ease of deployment:

1. **`Minecraft-Server-Manager-Web`**: The frontend control panel, built with React and Next.js.
2. **`Minecraft-Server-Manager-Api`**: The centralized backend (Express + Prisma SQLite). It handles JWT authentication and orchestrates data between the dashboard and local agents.
3. **`Minecraft-Server-Manager-LocalAgent`**: A lightweight Node.js daemon running on the host machine. It handles heavy lifting such as downloading JARs, spawning processes, bridging WebSocket logs, and managing local I/O.

## Documentation

For a deeper dive into the technical details and operations, please refer to our comprehensive documentation:

- **[System Architecture & Data Flow](docs/ARCHITECTURE.md)** (includes Mermaid diagrams)
- **[WebSockets API Reference](docs/api/WEBSOCKETS.md)**
- **[Local Agent Pairing Guide](docs/guides/AGENT_SETUP.md)**
- **[Security Measures (Zero-Trust)](docs/guides/SECURITY.md)**
- **[Mods and Plugins Management](docs/guides/MODS_PLUGINS.md)**

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)

*Note: Required Java Development Kits (JDKs) for Minecraft are automatically handled and downloaded by the Local Agent.*

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Jhomel-Dev/Minecraft-server.git
cd Minecraft-server
```

**2. Setup the API**
```bash
cd Minecraft-Server-Manager-Api
npm install
npx prisma db push
npm run dev
```
*(Ensure you create a `.env` file containing `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL`)*

**3. Setup the Web Dashboard**
```bash
cd ../Minecraft-Server-Manager-Web
npm install
npm run dev
```

**4. Setup the Local Agent**
```bash
cd ../Minecraft-Server-Manager-LocalAgent
npm install
npm start
```

Navigate to `http://localhost:3000` (or `3001` depending on your Next.js setup) to access the dashboard.

## Contributing

Contributions, issues, and feature requests are always welcome! 
Please carefully read our **[Contributing Guidelines](CONTRIBUTING.md)** before opening a Pull Request to understand our Git Flow, Clean Code rules, and CI/CD checks.

You can also refer to the [Issues page](https://github.com/Jhomel-Dev/Minecraft-server/issues) for planned features and bug tracking.

## License

This project is licensed under the MIT License.
