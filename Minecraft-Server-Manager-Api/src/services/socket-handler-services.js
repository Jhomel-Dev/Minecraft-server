export const handleSocketEvents = (io) => {
  io.on('connection', (socket) => {
    
    console.log(`Cliente conectado: ${socket.id}`);

   
    socket.on('error', (err) => {
      console.error(`Error en socket ${socket.id}:`, err);
    });

    
    socket.on('mensaje', (data) => {
      console.log('Datos recibidos:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Cliente desconectado (${socket.id}): ${reason}`);
    });
  });
};