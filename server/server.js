require('dotenv').config();
const http = require('http');
const { app } = require('./app');
const { connectDB } = require('./config/database');
const { initSocket } = require('./config/socket');
const { startAuctionScheduler } = require('./jobs/auctionScheduler');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const server = http.createServer(app);
  const io = initSocket(server);
  app.locals.io = io;
  startAuctionScheduler(io);
  server.listen(PORT, () => console.log(`CampusBid server running on http://localhost:${PORT}`));
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
