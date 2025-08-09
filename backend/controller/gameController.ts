import { Socket } from 'socket.io';
import Spin from '../models/Spin';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT, RATE_LIMIT_WINDOW, RATE_LIMIT_SPINS } from '../config/env';
import { invalidateLeaderboardCache } from './leaderboardController';

// 🔗 Redis connection for caching and session management
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

// 🚨 RATE LIMITING MIDDLEWARE
// Prevents users from spinning too frequently (configurable via env vars)
export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  return current <= RATE_LIMIT_SPINS;
}

// 🎰 ENHANCED SLOT GAME LOGIC
// Simulates a 3-reel slot machine with weighted random outcomes
export function simulateSlotSpin(): { outcome: string[], win: number, multiplier: number } {
  const symbols = ['🍒', '🍋', '🍊', '💎', '7️⃣', '🎰'];
  const weights = [0.25, 0.25, 0.2, 0.15, 0.1, 0.05]; // Cherry is most common
  
  // Weighted random selection for fair but exciting gameplay
  function weightedRandom(): string {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r < acc) return symbols[i];
    }
    return symbols[symbols.length - 1];
  }
  
  const outcome = [weightedRandom(), weightedRandom(), weightedRandom()];
  
  // Win logic based on symbol combinations
  let win = 0;
  let multiplier = 0;
  
  if (outcome[0] === outcome[1] && outcome[1] === outcome[2]) {
    // Three of a kind - highest payout
    const symbolIndex = symbols.indexOf(outcome[0]);
    const multipliers = [2, 3, 4, 10, 25, 100]; // Corresponding to symbols
    multiplier = multipliers[symbolIndex];
    win = multiplier;
  } else if (outcome[0] === outcome[1] || outcome[1] === outcome[2] || outcome[0] === outcome[2]) {
    // Two of a kind - small payout
    multiplier = 1;
    win = multiplier;
  }
  
  return { outcome, win, multiplier };
}

// 💰 Calculate user balance
export async function calculateUserBalance(userId: string): Promise<number> {
  const spins = await Spin.find({ userId });
  const totalWagered = spins.reduce((sum, s) => sum + s.wager, 0);
  const totalWon = spins.reduce((sum, s) => sum + s.win, 0);
  return 1000 + totalWon - totalWagered; // 1000 is initial balance
}

// 📊 Get user metrics
export async function getUserMetrics(userId: string, socketId: string) {
  const metrics = await redis.hgetall(`metrics:${userId}`);
  const spins = await Spin.find({ userId });
  
  // Calculate session duration
  const sessionData = await redis.get(`session:${userId}:${socketId}`);
  let sessionDuration = 0;
  if (sessionData) {
    const session = JSON.parse(sessionData);
    sessionDuration = Date.now() - session.startTime;
  }

  return {
    totalSpins: parseInt(metrics.totalSpins || '0'),
    totalWagered: parseInt(metrics.totalWagered || '0'),
    totalWon: parseInt(metrics.totalWon || '0'),
    sessionDuration,
    averageSessionDuration: sessionDuration, // Simplified for demo
    spins: spins.length
  };
}

// 🎰 Handle spin event
export async function handleSpin(userId: string, wager: number) {
  // Check rate limit first
  const rateLimitOk = await checkRateLimit(userId);
  if (!rateLimitOk) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMIT_SPINS} spins per ${RATE_LIMIT_WINDOW} seconds.`);
  }

  // Check balance
  const currentBalance = await calculateUserBalance(userId);
  if (wager > currentBalance) {
    throw new Error('Insufficient balance');
  }

  // Simulate slot spin with weighted random outcomes
  const { outcome, win: winAmount, multiplier } = simulateSlotSpin();
  const actualWin = winAmount * wager;

  // Save spin to database with metadata
  const spinId = `${userId}-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const spin = await Spin.create({
    userId,
    wager,
    win: actualWin,
    outcome,
    spinId,
    createdAt: new Date(),
    metadata: {
      multiplier,
      baseWin: winAmount
    }
  });

  // Invalidate leaderboard cache on new spin
  await invalidateLeaderboardCache();

  // Update metrics in Redis for real-time tracking
  await redis.hincrby(`metrics:${userId}`, 'totalSpins', 1);
  await redis.hincrby(`metrics:${userId}`, 'totalWagered', wager);
  await redis.hincrby(`metrics:${userId}`, 'totalWon', actualWin);

  // Return spin result
  return {
    spinId,
    outcome,
    win: actualWin,
    wager,
    multiplier,
    balance: currentBalance - wager + actualWin,
    timestamp: spin.createdAt,
  };
}

// 📜 Get user transactions
export async function getUserTransactions(userId: string, page: number = 1, pageSize: number = 10) {
  const spins = await Spin.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);
  const total = await Spin.countDocuments({ userId });
  return { spins, total };
}

// 🔌 Handle session management
export async function handleSessionStart(userId: string, socketId: string) {
  const sessionStart = Date.now();
  
  // Store session data in Redis for session management
  await redis.setex(`session:${userId}:${socketId}`, 3600, JSON.stringify({
    startTime: sessionStart,
    socketId: socketId
  }));
}

export async function handleSessionEnd(userId: string, socketId: string) {
  // Update session duration metrics
  const sessionData = await redis.get(`session:${userId}:${socketId}`);
  if (sessionData) {
    const session = JSON.parse(sessionData);
    const duration = Date.now() - session.startTime;
    await redis.hincrby(`metrics:${userId}`, 'totalSessionTime', duration);
  }
  
  // Clean up session data
  await redis.del(`session:${userId}:${socketId}`);
}
