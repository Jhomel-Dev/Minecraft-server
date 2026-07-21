import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SmartBootService from '../src/services/SmartBootService.js';
import http from 'http';
import { spawn } from 'child_process';

const originalExit = process.exit;

describe('SmartBootService Integration Tests', () => {
  const TEST_PORT = 45999;
  
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Debe reconectarse (Smart Boot) si el puerto está ocupado por un agente válido', async () => {
    const validServer = http.createServer((req, res) => {
      if (req.url === '/identity') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ identity: 'CraftControlAgent' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise(resolve => validServer.listen(TEST_PORT, '127.0.0.1', resolve));

    await SmartBootService.checkPortAndKillIfImposter(TEST_PORT);

    expect(process.exit).toHaveBeenCalledWith(0);

    await new Promise(resolve => validServer.close(resolve));
  });

  it('Debe matar el proceso si el puerto está ocupado por un impostor', async () => {
    const imposterCode = `
      import http from 'http';
      const s = http.createServer((req, res) => { res.writeHead(404); res.end('Imposter'); });
      s.listen(${TEST_PORT}, '127.0.0.1', () => console.log('ready'));
    `;
    
    const imposterProcess = spawn('node', ['-e', imposterCode], { shell: false });
    
    await new Promise(resolve => {
      imposterProcess.stdout.on('data', (d) => {
        if (d.toString().includes('ready')) resolve();
      });
    });

    await SmartBootService.checkPortAndKillIfImposter(TEST_PORT);

    const testServer = http.createServer();
    const listenPromise = new Promise((resolve, reject) => {
      testServer.once('error', reject);
      testServer.listen(TEST_PORT, '127.0.0.1', () => {
        resolve(true);
      });
    });

    const boundSuccessfully = await listenPromise;
    expect(boundSuccessfully).toBe(true);

    await new Promise(resolve => testServer.close(resolve));
    imposterProcess.kill('SIGKILL');
  }, 15000);
});
