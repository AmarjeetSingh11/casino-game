import { Socket } from 'socket.io';
import { 
  calculateUserBalance, 
  getUserMetrics, 
  handleSpin, 
  getUserTransactions,
  handleSessionStart,
  handleSessionEnd
} from './gameController';

/**
 * 🔌 Socket.IO Event Handler
 * Handles all WebSocket events for the casino game
 */
export class SocketController {
  
  /**
   * 💰 Handle 'balance' event
   * Responds with the user's current balance
   */
  static async handleBalance(socket: Socket, callback: (data: any) => void) {
    try {
      const userId = (socket as any).userId;
      const balance = await calculateUserBalance(userId);
      callback({ balance });
    } catch (err) {
      callback({ error: 'Failed to fetch balance' });
    }
  }

  /**
   * 📜 Handle 'transactions' event
   * Returns paginated spin history for the user
   */
  static async handleTransactions(socket: Socket, data: any, callback: (data: any) => void) {
    try {
      const userId = (socket as any).userId;
      const page = data?.page || 1;
      const pageSize = data?.pageSize || 10;
      
      const result = await getUserTransactions(userId, page, pageSize);
      callback(result);
    } catch (err) {
      callback({ error: 'Failed to fetch transactions' });
    }
  }

  /**
   * 🎰 Handle 'spin' event
   * Simulates a slot spin, processes wager, updates balance, and returns result
   */
  static async handleSpinEvent(socket: Socket, data: any, callback: (data: any) => void) {
    try {
      const userId = (socket as any).userId;
      const wager = Number(data?.wager);
      
      if (!wager || wager <= 0) {
        return callback({ error: 'Invalid wager' });
      }

      const result = await handleSpin(userId, wager);
      callback(result);
    } catch (err: any) {
      console.error('Spin error:', err);
      callback({ error: err.message || 'Failed to process spin' });
    }
  }

  /**
   * 📊 Handle 'metrics' event
   * Returns comprehensive user metrics and statistics
   */
  static async handleMetrics(socket: Socket, callback: (data: any) => void) {
    try {
      const userId = (socket as any).userId;
      const socketId = socket.id;
      
      const metrics = await getUserMetrics(userId, socketId);
      callback(metrics);
    } catch (err) {
      callback({ error: 'Failed to fetch metrics' });
    }
  }

  /**
   * 🔌 Handle connection
   * Sets up session tracking and initial data
   */
  static async handleConnection(socket: Socket) {
    const userId = (socket as any).userId;
    const socketId = socket.id;
    
    console.log('User connected:', userId, socketId);

    // Track session start
    await handleSessionStart(userId, socketId);

    // Set up event listeners
    socket.on('balance', (callback) => this.handleBalance(socket, callback));
    socket.on('transactions', (data, callback) => this.handleTransactions(socket, data, callback));
    socket.on('spin', (data, callback) => this.handleSpinEvent(socket, data, callback));
    socket.on('metrics', (callback) => this.handleMetrics(socket, callback));

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', userId, socketId);
      await handleSessionEnd(userId, socketId);
    });
  }
}
