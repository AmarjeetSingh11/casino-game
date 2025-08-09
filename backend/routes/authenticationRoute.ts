import express, { Request, Response, NextFunction } from 'express';
import { register, login, refresh, fetchUser } from '../controller/authenticationController';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

const router = express.Router();

// 🔐 Middleware to verify JWT token
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next();
  });
};

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/user', authenticateToken, fetchUser); // Protected route

export default router;

