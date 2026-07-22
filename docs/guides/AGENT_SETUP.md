# Local Agent Pairing Guide

This guide explains how to install and pair the CraftControl `LocalAgent` to your account so you can host servers from your own computer.

## 1. Prerequisites

- **Node.js (v18+)**: Make sure you have Node.js installed.
- You do not need to install Java manually; the Agent is responsible for downloading the exact JDK (Java Development Kit) version required based on the Minecraft engine and version you choose.

## 2. Installation

Open a terminal, navigate to the folder where you want to store your Minecraft servers, and run:

```bash
git clone https://github.com/Jhomel-Dev/Minecraft-server.git
cd Minecraft-server/Minecraft-Server-Manager-LocalAgent
npm install
```

## 3. Pairing

For the Web Dashboard to safely control your computer:

1. Run the agent locally:
   ```bash
   npm start
   ```
2. Upon startup, the agent will attempt to connect to the central API. Since it is its first time, it will generate a secure pairing code.
3. Check your terminal. You will see a message like:
   `> Security PIN: 123456 (Expires in 5 minutes)`
4. Go to the **Web Dashboard** from your browser.
5. Log in, navigate to the "Servers" section, and when prompted, enter the 6-digit PIN that appeared in your terminal.

You're all set! The agent will automatically receive a persistent `agentToken`. From now on, every time you start it, it will immediately connect to your account without requiring a PIN.

## 4. Troubleshooting

- **Agent won't connect to API**: Make sure there is no firewall blocking outgoing connections on port 4000.
- **EADDRINUSE Error**: This occurs when the port the Minecraft server is trying to use (default `25565`) is already being used by another program or a zombie Java server. Restart your PC or kill the Java process manually.
