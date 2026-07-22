# System Architecture & Logic (CraftControl)

This document details the structure and data flow of the **CraftControl** ecosystem. The objective is to understand how the three main modules (`Web`, `API`, and `LocalAgent`) interact with each other.

## 1. System Topology

CraftControl is composed of three key pieces:

1. **Web Dashboard (Next.js):** The user-facing graphical interface.
2. **Central API (Express.js):** The orchestrator of the database and WebSocket connections.
3. **LocalAgent (Node.js daemon):** A lightweight client that runs on the host machine where the servers will reside. It executes Java processes and exposes ports.

## 2. Authentication Flow (JWT)

The system uses a JWT-based authentication model with Refresh Tokens to ensure session persistence.

```mermaid
sequenceDiagram
    participant C as Web Client
    participant A as Central API
    participant DB as Database

    C->>A: POST /api/auth/login (email, pass)
    A->>DB: Verify credentials
    DB-->>A: Valid user
    A->>A: Generate AccessToken (15m) & RefreshToken (7d)
    A-->>C: Set-Cookie: accessToken & refreshToken (HttpOnly)
    C->>A: GET /api/servers (Requires Auth)
    A->>A: Verify accessToken
    A-->>C: Return servers
```

## 3. Local Agent Pairing Flow

For the Web Dashboard to control servers on a user's machine, the user must pair their LocalAgent with the API using a securely generated random PIN.

```mermaid
sequenceDiagram
    participant U as User (Web)
    participant LA as LocalAgent
    participant API as Central API

    LA->>API: Start and request a Pairing PIN
    API-->>LA: Return 6-digit PIN
    LA->>LA: Display PIN in console
    U->>LA: Read PIN from console
    U->>API: Enter PIN in the Web Dashboard
    API->>API: Validate PIN and expire PairingCode
    API-->>LA: Issue persistent agent token (agentToken)
    LA->>API: Connect WebSocket using agentToken
```

## 4. Network Architecture & TCP Tunnel (Bore)

The `LocalAgent` spins up the Minecraft server locally. So that external players can connect without requiring the host to open ports on their router (Port Forwarding), CraftControl utilizes TCP tunnels.

```mermaid
graph TD
    A[Minecraft Player] -->|Connects to| B(Bore Domain e.g., bore.pub:12345)
    B -->|Reverse TCP Tunnel| C[LocalAgent]
    C -->|Redirects traffic| D[Server Java Process on Port 25565]
    
    E[Web Dashboard] -.->|Displays tunnel IP to owner| F(Central API)
    F -.->|Updates public IP| C
```

## 5. Database Schema (Entity-Relationship Diagram)

The database (PostgreSQL via Prisma) manages users, their servers, and temporary pairing codes.

```mermaid
erDiagram
    User ||--o{ Server : "creates and manages"
    User |o--o{ PairingCode : "pairs agent via"

    User {
        String id PK
        String username "UNIQUE"
        String email "UNIQUE"
        String password
        String agentToken "WebSocket token for LocalAgent"
    }

    Server {
        String id PK
        String name
        String type "VANILLA, PAPER, FORGE, etc."
        String status "OFFLINE, ONLINE, STARTING"
        Int maxPlayers
        Int port "Internal port"
        String tunnelIp "Reverse TCP tunnel IP"
        String userId FK
    }

    PairingCode {
        String id PK
        String pin "6-digit UNIQUE code"
        DateTime expiresAt
        Boolean isClaimed
        String userId FK "Optional, assigned upon claim"
    }
```
