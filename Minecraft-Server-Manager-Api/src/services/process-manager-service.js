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

            this.status = 'running';
            this.emit('status-change', this.status);

            this.mcProcess.stdout.on('data', (data) => {
                const log = data.toString();
                process.stdout.write(`[MC] ${log}`);
                this.emit('log', log);
            });

            this.mcProcess.stderr.on('data', (data) => {
                const log = data.toString();
                process.stderr.write(`[MC-ERR] ${log}`);
                this.emit('log', log);
            });

            this.mcProcess.on('close', (code) => {
                console.log(`Servidor Minecraft cerrado con código: ${code}`);
                this.status = 'stopped';
                this.mcProcess = null;
                this.emit('status-change', this.status);
                this.emit('log', `--- Servidor Detenido (Código ${code}) ---\n`);
            });

            return true;
        } catch (error) {
            console.error('Error al hacer spawn del proceso:', error);
            this.status = 'stopped';
            this.mcProcess = null;
            this.emit('status-change', this.status);
            return false;
        }
    }

    sendCommand(cmd) {
        if (!this.mcProcess || this.status === 'stopped') {
            console.warn('Intento de enviar comando con servidor detenido.');
            return false;
        }

        try {
            this.mcProcess.stdin.write(`${cmd}\n`);
            this.emit('log', `> Enviando comando: ${cmd}`);
            return true;
        } catch (error) {
            console.error("Error al enviar comando:", error);
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
            console.warn("Intento de kill con proceso inexistente");
            return false;
        }

        console.warn("Forzando detención del servidor (force kill)...");

        try {
            const killed = this.mcProcess.kill();

            if (killed) {
                this.status = 'stopped';
                this.mcProcess = null;
                this.emit('status-change', this.status);
                this.emit('log', '--- Servidor forzado a detenerse (force kill) ---\n');
            }

            return killed;
        } catch (error) {
            console.error("Error al intentar force kill:", error);
            this.emit('log', `ERROR: No se pudo forzar detención: ${error.message}`);
            return false;
        }
    }
}

export default ProcessManagerService;