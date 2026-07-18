import net from 'net';

const SINGLE_INSTANCE_PORT = 45987;

export const enforceSingleInstance = () => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('[ERROR] Ya hay otra instancia del Agente corriendo. Cerrando...');
        process.exit(1);
      }
    });
    server.listen(SINGLE_INSTANCE_PORT, '127.0.0.1', () => {
      resolve();
    });
  });
};
