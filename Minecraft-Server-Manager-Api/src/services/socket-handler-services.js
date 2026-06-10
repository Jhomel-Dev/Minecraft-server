export const handleSocketEvents = (io) => {
  io.use(authenticateSocket);
  io.on('connection', registerAgentEvents);
};

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token || token !== process.env.AGENT_SECRET_TOKEN) {
    return next(new Error('Authentication Error: Invalid Token'));
  }
  next();
};

const registerAgentEvents = (socket) => {
  socket.on('TELEMETRY_UPDATE', (stats) => handleTelemetry(socket, stats));
  socket.on('SERVER_LOG', (logLine) => handleServerLog(socket, logLine));
  socket.on('TUNNEL_INFO', (info) => handleTunnelInfo(socket, info));
  socket.on('disconnect', (reason) => handleDisconnect(socket, reason));
};

const handleTelemetry = (socket, stats) => {
  // Pending: Broadcast to User Frontend
};

const handleServerLog = (socket, logLine) => {
  // Pending: Broadcast to User Frontend
};

const handleTunnelInfo = (socket, info) => {
  // Pending: Save Tunnel IP to Database
};

const handleDisconnect = (socket, reason) => {
  // Pending: Mark server as offline
};