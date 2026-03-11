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


const port = process.env.PORT || 3000;
const socketPort = process.env.SOCKET_PORT;

app.listen(port, () => {
    console.log(`Server running on port: ${port}`)
});



httpServer.listen(socketPort, '0.0.0.0', () => {
    console.log(`Server socket.io running on port: ${socketPort}`);
});


httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(` ERROR: Puerto ${socketPort} ya está en uso`);
        process.exit(1);
    } else if (err.code === 'EACCES') {
        console.error(` ERROR: Sin permisos para usar puerto ${socketPort}`);
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