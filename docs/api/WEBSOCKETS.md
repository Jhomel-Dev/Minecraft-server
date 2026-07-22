# WebSockets (Socket.IO) API Reference

CraftControl utilizes WebSockets extensively to achieve real-time log streaming and allow the Web Dashboard to instantly communicate with the LocalAgent.

## Base Endpoint
The WebSocket server runs on the same port as the main API (by default `http://localhost:4000`).

## Events Emitted by the Web Dashboard

These events are sent from the user's browser to the Central API, which then relays them to the `LocalAgent`.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `server:start` | `{ serverId: string }` | Requests the start of a specific Minecraft server. |
| `server:stop` | `{ serverId: string }` | Requests the safe shutdown of the server (executes the `stop` command). |
| `server:command` | `{ serverId: string, command: string }` | Executes a command on the server console (e.g., `op Jhomel`). |

## Events Emitted by the LocalAgent

These events originate from the machine running the Minecraft servers and are broadcasted by the Central API to the user's Dashboard.

| Event | Payload | Description |
| :--- | :--- | :--- |
| `server:log` | `{ serverId: string, log: string }` | Sends a new line from the server console. |
| `server:status` | `{ serverId: string, status: string }` | Updates the server status (`ONLINE`, `OFFLINE`, `STARTING`). |
| `server:stats` | `{ serverId: string, stats: { cpu: string, ram: string } }` | Transmits the resource usage of the Java process. |
| `agent:online` | `{ agentToken: string }` | The LocalAgent confirms a successful connection to the API. |

## Security

1. Every client (whether a LocalAgent or a Web Dashboard) must authenticate using a JWT when establishing the Socket.IO connection.
2. The Dashboard relies on `HttpOnly` cookies that are validated during the handshake.
3. The LocalAgent uses its persistent `agentToken` provided after completing the Pairing process.
