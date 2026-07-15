import { spawn } from 'child_process';
import EventEmitter from 'events';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { isWindows, extractArchive } from '../utils/osUtils.js';
import { downloadFile } from '../utils/httpUtils.js';
import { verifyFileChecksum } from '../utils/cryptoUtils.js';

export default class TunnelService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.managerDir = path.join(os.homedir(), '.minecraft-manager');
    }

    async startTunnel(port, secret = null) {
        if (this.isRunning()) {
            this.emit('log', '[Tunnel] El tunel ya esta en ejecucion, ignorando orden.');
            return;
        }

        const borePath = path.join(this.managerDir, isWindows ? 'bore.exe' : 'bore');
        
        try {
            await this.ensureBoreIsInstalled(borePath);
            this.launchBoreProcess(borePath, secret, port);
        } catch (error) {
            this.emit('log', `[Tunnel] Excepcion al lanzar el tunel: ${error.message}`);
        }
    }

    async ensureBoreIsInstalled(borePath) {
        if (fs.existsSync(borePath)) return;

        this.emit('log', `[Tunnel] Instalando motor de red sin friccion (bore)...`);
        
        const archiveExt = isWindows ? '.zip' : '.tar.gz';
        const archivePath = path.join(this.managerDir, `bore${archiveExt}`);
        const downloadUrl = this.getBoreDownloadUrl();
        
        const expectedHash = this.getBoreExpectedHash();
        
        await downloadFile(downloadUrl, archivePath);
        await verifyFileChecksum(archivePath, expectedHash);
        
        await extractArchive(archivePath, this.managerDir);
        
        fs.unlinkSync(archivePath);
        this.setExecutionPermissions(borePath);
    }

    getBoreExpectedHash() {
        if (isWindows) {
            return 'a072e180039f78d804e1743ca56a25335593862701bd606f2a317828c28ba337';
        }
        return 'f73f3c608fcb926cadeecd7615302e452eea60998abe7204c4383980f1e2912e';
    }

    getBoreDownloadUrl() {
        if (isWindows) {
            return 'https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-pc-windows-msvc.zip';
        }
        return 'https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz';
    }

    setExecutionPermissions(borePath) {
        if (isWindows) return;
        fs.chmodSync(borePath, 0o755);
    }

    launchBoreProcess(borePath, secret, port) {
        this.emit('log', `[Tunnel] Iniciando tunel TCP dinamico en puerto ${port}...`);
        const args = this.buildBoreArgs(secret, port);
        
        this.process = spawn(borePath, args);
        this.attachProcessListeners();
    }

    buildBoreArgs(secret, port) {
        const args = ['local', port.toString(), '--to', 'bore.pub'];
        if (!secret) return args;
        
        args.push('--secret', secret);
        this.emit('log', `[Tunnel] Usando token secreto de autenticacion.`);
        return args;
    }

    attachProcessListeners() {
        this.process.on('error', (err) => {
            this.emit('log', `[Tunnel] Error: fallo al iniciar. (Detalle: ${err.message})`);
        });

        this.process.stdout.on('data', (data) => this.handleBoreOutput(data));
        this.process.stderr.on('data', (data) => this.handleBoreOutput(data));

        this.process.on('close', (code) => {
            this.emit('log', `[Tunnel] Proceso detenido con codigo ${code}`);
            this.process = null;
        });
    }

    handleBoreOutput(data) {
        const output = data.toString();
        const match = output.match(/listening at (bore\.pub:\d+)/);
        if (!match) return;

        const address = match[1];
        this.emit('log', `[Tunnel] Tunel establecido exitosamente en ${address}!`);
        this.emit('address_assigned', address);
    }

    stopTunnel() {
        if (!this.process) return;
        this.process.kill('SIGINT');
        this.process = null;
    }

    isRunning() {
        return this.process !== null;
    }
}
