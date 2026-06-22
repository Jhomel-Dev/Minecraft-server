import { spawn } from 'child_process';
import EventEmitter from 'events';

export default class TunnelService extends EventEmitter {
  constructor() {
    super();
    this.playitProcess = null;
  }

  startTunnel(secretKey = null) {
    this.verifyNotRunning();

    const args = this.buildArgs(secretKey);
    try {
      this.playitProcess = spawn('playit', args);
      
      this.playitProcess.on('error', (err) => {
        this.emit('log', `[Tunnel] Error: Playit no está instalado o falló al iniciar. El servidor seguirá localmente. (Detalle: ${err.message})`);
        this.playitProcess = null;
      });

      this.attachProcessListeners();
    } catch (err) {
      this.emit('log', `[Tunnel] Error iniciando el túnel: ${err.message}`);
    }
  }

  stopTunnel() {
    if (!this.playitProcess) return;
    this.playitProcess.kill('SIGINT');
    this.playitProcess = null;
  }

  verifyNotRunning() {
    if (this.playitProcess) throw new Error('Tunnel is already running');
  }

  buildArgs(secretKey) {
    const args = [];
    if (secretKey) args.push('--secret', secretKey);
    return args;
  }

  attachProcessListeners() {
    this.playitProcess.stdout.on('data', (data) => this.processOutput(data.toString()));
    this.playitProcess.stderr.on('data', (data) => this.processError(data.toString()));
    this.playitProcess.on('close', (code) => this.handleClose(code));
  }

  processOutput(output) {
    this.emit('log', output);
    this.checkForClaimLink(output);
    this.checkForAssignedAddress(output);
  }

  processError(error) {
    this.emit('error', error);
  }

  handleClose(code) {
    this.emit('close', code);
    this.playitProcess = null;
  }

  checkForClaimLink(output) {
    const claimLinkRegex = /(https:\/\/playit\.gg\/claim\/[a-zA-Z0-9]+)/;
    const match = output.match(claimLinkRegex);
    if (match) this.emit('claim_link', match[1]);
  }

  checkForAssignedAddress(output) {
    const addressRegex = /Tunnel address:\s+([a-zA-Z0-9.-]+:[0-9]+)/;
    const match = output.match(addressRegex);
    if (match) this.emit('address_assigned', match[1]);
  }
}
