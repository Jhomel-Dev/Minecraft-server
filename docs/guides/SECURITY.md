# Security Measures in CraftControl

Because the CraftControl `LocalAgent` allows the remote execution of processes and files on your machine, we have implemented a strict "Zero Trust" philosophy.

This document explains the security strategies.

## 1. File Manager Isolation (Path Traversal)

The file management system (`FileService`) absolutely restricts all read, write, and delete operations.
- `path.resolve` is used to verify that the final computed path is strictly within the corresponding server's subfolder (`servers/<serverId>/...`).
- If a malicious attempt sends paths like `../../../../etc/passwd`, the agent intercepts the request, returns a `403 Forbidden` error, and denies access.

## 2. JVM Argument Injection

All parameters passed to the JVM when starting a Minecraft server are pre-assembled programmatically.
- Regular expressions are validated against the amount of allocated RAM (e.g., `2G`, `1024M`).
- Injected console commands are mitigated by using `shell: false` in `spawn()`.

## 3. Rate Limiting

To prevent brute force attacks, especially in the Auth and Pairing systems:
- `express-rate-limit` blocks IP addresses that attempt to try too many PINs or passwords.
- Global request limits are enforced.

## 4. Communication and Socket.IO

- There are no direct incoming HTTP or Socket.IO connections to the LocalAgent (which bypasses Firewall issues). The LocalAgent acts as a client and *calls out* to the Central API, keeping your network ports secure.
- Commands are only accepted if the WebSocket payload matches your exact session token, which is in turn signed by the JWT secret.
