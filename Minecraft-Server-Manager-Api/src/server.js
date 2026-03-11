import { createServer } from "http";
import { Server } from "socket.io";
import app from "./index.js"; 
import { handleSocketEvents } from "./services/socket-handler-services.js";


const httpServer = createServer(app);


const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});


handleSocketEvents(io);


const PORT = process.env.SOCKET_PORT || 3000;


httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server socket.io running on port: ${PORT}`);
});