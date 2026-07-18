import http from 'http';

export default class LocalDaemonController {
  constructor(port = 45987) {
    this.port = port;
    this.status = 'initializing';
    this.server = null;
    this.onUnlinkCallback = null;
    this.onShutdownCallback = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error('[ERROR] Ya hay una instancia corriendo en el puerto', this.port);
          process.exit(1);
        }
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  setStatus(newStatus) {
    this.status = newStatus;
  }

  onUnlink(callback) {
    this.onUnlinkCallback = callback;
  }

  onShutdown(callback) {
    this.onShutdownCallback = callback;
  }

  handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      return res.end();
    }

    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: this.status,
        pin: global.currentPairingPin || null
      }));
    }

    if (req.url === '/unlink' && req.method === 'POST') {
      if (this.onUnlinkCallback) this.onUnlinkCallback();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.url === '/shutdown' && req.method === 'POST') {
      this.status = 'shutting_down';
      if (this.onShutdownCallback) this.onShutdownCallback();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Graceful shutdown initiated' }));
    }

    res.writeHead(404);
    res.end();
  }
}
