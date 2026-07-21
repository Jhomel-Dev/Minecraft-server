import { createServer } from "http";
import { Server } from "socket.io";
import app from "./index.js"; 
import { handleSocketEvents } from "./modules/agent/gateways/agent.gateway.js";
import dotenv from "dotenv"
import rateLimit from "express-rate-limit";
import prisma from "./core/database/prisma.client.js";

dotenv.config();

const httpServer = createServer(app);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 300, 
  message: { error: 'Demasiadas peticiones. Has superado el límite de 300 por minuto. Por favor, espera.' }
});

app.use('/api/', apiLimiter);

const io = new Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            callback(null, origin || true);
        },
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

handleSocketEvents(io);
app.set('io', io);


let port = parseInt(process.env.PORT) || 4000;

const startServer = async (currentPort) => {
    try {
        await prisma.server.updateMany({
            data: { status: 'OFFLINE', tunnelIp: null }
        });
        console.log('[System] Servidores reseteados a OFFLINE (Cold Start fix).');
    } catch (e) {
        console.error('Error reseteando estado de servidores:', e);
    }

    httpServer.listen(currentPort, () => {
        console.log(`Server HTTP & Socket.io running on port: ${currentPort}`);
    });
};

httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(` ERROR: Puerto ${port} ya está en uso, intentando el siguiente...`);
        port++;
        startServer(port);
    } else if (err.code === 'EACCES') {
        console.error(` ERROR: Sin permisos para usar puerto ${port}`);
        process.exit(1);
    } else {
        console.error(' ERROR del servidor HTTP:', err);
        process.exit(1);
    }
});

startServer(port);


io.engine.on('connection_error', (err) => {
    console.error(' Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        context: err.context
    });
});

process.on('uncaughtException', (error) => {
    console.error('\n[CRÍTICO] Uncaught Exception atrapada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n[CRÍTICO] Unhandled Rejection atrapada:', reason);
});