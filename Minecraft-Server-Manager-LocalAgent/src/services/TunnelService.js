import { spawn, execSync } from 'child_process';
import EventEmitter from 'events';
import path from 'path';
import os from 'os';
import fs from 'fs';

export default class TunnelService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
  }

  async startTunnel() {
    this.verifyNotRunning();

    const managerDir = path.join(os.homedir(), '.minecraft-manager');
    const borePath = path.join(managerDir, 'bore');
    
    // Auto-install bore if not exists
    if (!fs.existsSync(borePath)) {
      this.emit('log', `[Tunnel] Instalando motor de red sin fricción (bore)...`);
      try {
        execSync(`curl -sSL https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz | tar -xz -C "${managerDir}" && chmod +x "${borePath}"`);
      } catch (err) {
        this.emit('log', `[Tunnel] Error instalando bore: ${err.message}`);
        return;
      }
    }

    try {
      this.emit('log', `[Tunnel] Iniciando túnel TCP dinámico...`);
      this.process = spawn(borePath, ['local', '25565', '--to', 'bore.pub']);
      
      this.process.on('error', (err) => {
        this.emit('log', `[Tunnel] Error: falló al iniciar. (Detalle: ${err.message})`);
      });

      this.process.stdout.on('data', (data) => {
        const output = data.toString();
        // bore outputs: INFO bore_cli::client: listening at bore.pub:PORT
        const match = output.match(/listening at (bore\.pub:\d+)/);
        if (match) {
          const address = match[1];
          this.emit('log', `[Tunnel] ¡Túnel establecido exitosamente en ${address}!`);
          this.emit('address_assigned', address);
        }
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/listening at (bore\.pub:\d+)/);
        if (match) {
          const address = match[1];
          this.emit('log', `[Tunnel] ¡Túnel establecido exitosamente en ${address}!`);
          this.emit('address_assigned', address);
        }
      });

      this.process.on('close', (code) => {
        this.emit('log', `[Tunnel] Proceso detenido con código ${code}`);
        this.process = null;
      });

    } catch (error) {
      this.emit('log', `[Tunnel] Excepción al lanzar el túnel: ${error.message}`);
    }
  }

  stopTunnel() {
    if (!this.process) return;
    this.process.kill('SIGINT');
    this.process = null;
  }

  verifyNotRunning() {
    if (this.process) throw new Error('Tunnel is already running');
  }
}
