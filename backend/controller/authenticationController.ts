import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Redis from 'ioredis';
import { JWT_SECRET, REFRESH_SECRET, REDIS_HOST, REDIS_PORT } from '../config/env';

// 🔗 Redis connection for session management
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

// ⏰ Token expiration times
const ACCESS_EXPIRES_IN = '15m';  // Short-lived access token
const REFRESH_EXPIRES_IN = '7d';  // Long-lived refresh token

/**
 * 🔑 Generate JWT access token
 * Used for API authentication and WebSocket connections
 */
function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

/**
 * 🔄 Generate JWT refresh token
 * Used to get new access tokens when they expire
 */
function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

/**
 * 📝 Register controller
 * Creates new user account with hashed password
 */
export const register = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    // 🔒 Hash password using bcrypt for security
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
};

/**
 * 🔐 Login controller
 * Validates credentials and issues JWT tokens
 */
export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  // Find user by username
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  
  // 🔒 Verify password using bcrypt
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  // 🎫 Generate JWT tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());
  
  // 💾 Store refresh token in Redis for session management
  await redis.set(`refresh:${user._id}`, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days
  
  res.json({ accessToken, refreshToken });
};

/**
 * 🔄 Refresh token controller
 * Issues new access and refresh tokens using valid refresh token
 */
export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  
  try {
    // 🔍 Verify refresh token
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    
    // Check if refresh token exists in Redis (not revoked)
    const stored = await redis.get(`refresh:${payload.userId}`);
    if (stored !== refreshToken) return res.status(401).json({ error: 'Invalid refresh token' });
    
    // 🎫 Generate new tokens
    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);
    
    // 💾 Update refresh token in Redis
    await redis.set(`refresh:${payload.userId}`, newRefreshToken, 'EX', 7 * 24 * 60 * 60);
    
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/**
 * 👤 Fetch user controller
 * Returns user information (excluding password)
 */
export const fetchUser = async(req: Request, res: Response) => {
  try {
    // Get user ID from the authenticated request (set by middleware)
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
