import { spawn } from "child_process";
import { EventEmitter } from 'events';
import path from "path";
import fs from "fs";

class ProcessManagerService extends EventEmitter {
    constructor() {
        super();

        this.status = 'stopped';
        this.mcProcess = null;
        this.serverPath = process.env.MINECRAFT_PATH;
        this._logBuffer = '';
        this._errorBuffer = "";
    }

    startServer() {
        if (this.status !== "stopped") {
            throw new Error(`Intento de inicio bloqueado. Estado actual: ${this.status}`);
        }

        const batchFilePath = path.join(this.serverPath, "run.bat");
        if (!fs.existsSync(batchFilePath)) {
            const errorMsg = `ERROR: No se encuentra run.bat en: ${batchFilePath}`;
            console.error(errorMsg);
            this.emit('log', errorMsg);
            return false;
        }

        this.status = 'starting';
        this.emit('status-change', this.status);
        console.log('Iniciando servidor de Minecraft...');

        try {
            this.mcProcess = spawn('cmd.exe', ['/c', 'run.bat'], {
                cwd: this.serverPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.mcProcess.stdout.setEncoding('utf8');
            this.mcProcess.stderr.setEncoding('utf8');

            this.mcProcess.stdout.on('data', (chunk) => this._handleStdout(chunk));
            this.mcProcess.stderr.on('data', (chunk) => this._handleStderr(chunk));

            this.mcProcess.on('close', (code) => this._handleClose(code));
            this.mcProcess.on('error', (err) => this._handleError(err));

            return true;
        } catch (error) {
            console.error('Error al hacer spawn del proceso:', error);
            this._handleError(error);
            return false;
        }
    }

    sendCommand(cmd) {
        if (!this.mcProcess || this.status === 'stopped' || this.status === 'stopping') {
            console.warn(`[ProcessManager] Intento de enviar comando en estado: ${this.status}`);
            return false;
        }

        try {
            this.mcProcess.stdin.write(`${cmd}\n`);
            this.emit('log', `> Enviando comando: ${cmd}`);
            return true;
        } catch (error) {
            console.error("[ProcessManager] Error al enviar comando:", error);
            this.emit('error', error);
            return false;
        }
    }

    stopServer() {
        if (this.status === 'stopped') {
            return false;
        }
        console.log("Enviando señal de parada suave (stop)...");

        this.status = 'stopping';
        this.emit('status-change', this.status);

        const sent = this.sendCommand('stop');

        return sent;
    }

    killServer() {
        if (!this.mcProcess) {
            console.warn("[ProcessManager] Intento de kill con proceso inexistente");
            return false;
        }

        console.warn("[ProcessManager] Forzando detención del servidor (force kill)...");

        try {
            const killed = this.mcProcess.kill();

            if (killed) {
                this._setStatus('stopped');
                this.mcProcess = null;
                this.emit('log', '--- Servidor forzado a detenerse (force kill) ---\n');
            }

            return killed;
        } catch (error) {
            console.error("[ProcessManager] Error al intentar force kill:", error);
            this.emit('error', error);
            return false;
        }
    }

    _handleStdout(chunk) {
        this._logBuffer += chunk;

        const lines = this._logBuffer.split('\n');

        this._logBuffer = lines.pop();

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            this.emit('log', cleanLine);

            if (this.status === 'starting' && cleanLine.includes('Done!')) {
                this._setStatus('running');
                this.emit('serverStarted');
            }
        }
    }

    _handleStderr(chunk) {
        this._errorBuffer += chunk;
        const lines = this._errorBuffer.split('\n');
        this._errorBuffer = lines.pop();

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            this.emit('log', `[STDERR] ${cleanLine}`);
        }
    }

    _handleClose(code) {
        console.log(`[ProcessManager] Proceso cerrado con código: ${code}`);

        this._logBuffer = '';
        this._errorBuffer = '';
        this.mcProcess = null;

        if (this.status === 'stopping') {
            this.emit('serverStopped');
        } else {
            console.error('[ProcessManager] El servidor se cerró inesperadamente.');
            this.emit('serverCrashed', code);
        }

        this._setStatus('stopped');
    }

    _handleError(error) {
        console.error('[ProcessManager] Error crítico en el proceso:', error);
        this.emit('error', error);
        this._setStatus('stopped');
    }

    _setStatus(newStatus) {
        this.status = newStatus;
        this.emit('status-change', newStatus);
    }
}


export default ProcessManagerService;