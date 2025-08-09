// Import dependencies
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes
import authenticationRoute from '../routes/authenticationRoute';
import leaderboardRoute from '../routes/leaderboardRoute';

// Import controllers and middleware
import { SocketController } from '../controller/socketController';
import { socketAuthMiddleware } from '../middleware/socketAuth';
import { invalidateLeaderboardCache } from '../controller/leaderboardController';

// Import configuration
import { MONGO_URI, PORT } from '../config/env';

// Load environment variables
dotenv.config();

// 🔗 Connect to MongoDB database
mongoose.connect(MONGO_URI, { dbName: 'casino' })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', authenticationRoute);
app.use('/api', leaderboardRoute);

// 🔌 Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 🔐 Apply Socket.IO authentication middleware
io.use(socketAuthMiddleware);

// 🔌 Socket.IO connection handler
io.on('connection', (socket) => {
  // Handle connection using SocketController
  SocketController.handleConnection(socket);
});

// 🚀 Start the server
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
