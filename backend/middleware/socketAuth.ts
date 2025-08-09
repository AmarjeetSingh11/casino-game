import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

/**
 * 🔐 Socket.IO Authentication Middleware
 * Validates JWT tokens for all WebSocket connections
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    return next(new Error('No token provided'));
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).userId = payload.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}


