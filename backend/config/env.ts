import dotenv from 'dotenv';
dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/casino';
export const JWT_SECRET = process.env.JWT_SECRET || 'myjwtsecret';
export const REFRESH_SECRET = process.env.REFRESH_SECRET || 'myrefreshsecret';
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
export const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW ? Number(process.env.RATE_LIMIT_WINDOW) : 60;
export const RATE_LIMIT_SPINS = process.env.RATE_LIMIT_SPINS ? Number(process.env.RATE_LIMIT_SPINS) : 10;
export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
