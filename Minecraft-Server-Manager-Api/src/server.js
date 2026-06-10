import { createServer } from "http";
import { Server } from "socket.io";
import app from "./index.js"; 
import { handleSocketEvents } from "./services/socket-handler-services.js";
import dotenv from "dotenv"

dotenv.config();

const httpServer = createServer(app);


const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

handleSocketEvents(io);
app.set('io', io);


const port = process.env.PORT || 3000;

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server HTTP & Socket.io running on port: ${port}`);
});


httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(` ERROR: Puerto ${port} ya está en uso`);
        process.exit(1);
    } else if (err.code === 'EACCES') {
        console.error(` ERROR: Sin permisos para usar puerto ${port}`);
        process.exit(1);
    } else {
        console.error(' ERROR del servidor HTTP:', err);
        process.exit(1);
    }
});

// Manejo de errores de Socket.IO
io.engine.on('connection_error', (err) => {
    console.error(' Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        context: err.context
    });
});