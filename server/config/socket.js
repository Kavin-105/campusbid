const { Server } = require('socket.io');

const initSocket = (server) => {
  const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
  io.on('connection', (socket) => {
    socket.on('join-auction', (auctionId) => auctionId && socket.join(String(auctionId)));
    socket.on('leave-auction', (auctionId) => auctionId && socket.leave(String(auctionId)));
  });
  return io;
};

module.exports = { initSocket };
