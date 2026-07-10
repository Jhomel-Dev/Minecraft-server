import { spawn } from 'child_process';
import EventEmitter from 'events';
import pidusage from 'pidusage';
import os from 'os';
import { killProcessHard } from '../utils/osUtils.js';

export default class ServerProcess extends EventEmitter {
    constructor(dataDir, javaExe, spawnArgs) {
        super();
        this.dataDir = dataDir;
        this.javaExe = javaExe;
        this.spawnArgs = spawnArgs;
        this.process = null;
        this.metricsInterval = null;
    }

    start() {
        this.process = spawn(this.javaExe, this.spawnArgs, {
            cwd: this.dataDir,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.attachOutputListeners();
        this.startTelemetry();
        
        this.process.on('exit', () => this.handleExit());
        return this.process.pid.toString();
    }

    attachOutputListeners() {
        this.process.stdout.on('data', (data) => this.processStdout(data));
        this.process.stderr.on('data', (data) => this.processStderr(data));
    }

    processStdout(data) {
        const lines = data.toString('utf8').split('\n');
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            this.emit('log', line);
            this.detectPlayerEvents(line);
            this.detectServerStarted(line);
        }
    }

    detectServerStarted(line) {
        if (line.includes('Done (') && line.includes(')! For help')) {
            this.emit('started');
        }
    }

    processStderr(data) {
        const logLine = data.toString('utf8').trim();
        if (!logLine) return;
        this.emit('log', logLine);
    }

    detectPlayerEvents(line) {
        const joinMatch = line.match(/\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) joined the game/);
        if (joinMatch) this.emit('player_join', joinMatch[1]);
        
        const leaveMatch = line.match(/\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) left the game/);
        if (leaveMatch) this.emit('player_leave', leaveMatch[1]);
    }

    startTelemetry() {
        if (this.metricsInterval) clearInterval(this.metricsInterval);
        
        this.metricsInterval = setInterval(async () => {
            if (!this.process || !this.process.pid) return;
            try {
                const stats = await pidusage(this.process.pid);
                this.emit('telemetry', {
                    cpu: stats.cpu / os.cpus().length,
                    memory: stats.memory
                });
            } catch (err) {}
        }, 3000);
    }

    handleExit() {
        if (this.metricsInterval) clearInterval(this.metricsInterval);
        this.process = null;
        this.emit('stopped');
    }

    async stop() {
        if (!this.process) return;

        return new Promise((resolve) => {
            this.process.once('exit', resolve);
            this.sendCommand('stop');
            
            setTimeout(() => {
                if (this.process) {
                    killProcessHard(this.process.pid);
                    this.process = null;
                }
                resolve();
            }, 10000);
        });
    }

    sendCommand(command) {
        if (!this.process || !this.process.stdin) throw new Error('Server is not running');
        try {
            this.process.stdin.write(`${command}\n`);
        } catch (e) {}
    }
}
