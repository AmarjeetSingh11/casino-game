import { Request, Response } from 'express';
import Spin from '../models/Spin';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '../config/env';

// 🔗 Redis connection for caching
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

/**
 * 🏆 Get leaderboard with caching
 * Returns top players ranked by net win for the specified time period
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const cacheKey = `leaderboard:${days}`;
    
    // Check Redis cache first for performance
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Calculate leaderboard using MongoDB aggregation
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const leaderboard = await Spin.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalWagered: { $sum: '$wager' },
          totalWon: { $sum: '$win' },
          totalSpins: { $sum: 1 },
          netWin: { $sum: { $subtract: ['$win', '$wager'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          totalWagered: 1,
          totalWon: 1,
          totalSpins: 1,
          netWin: 1
        }
      },
      {
        $sort: { netWin: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Cache results in Redis for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(leaderboard));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

/**
 * 🗑️ Invalidate leaderboard cache
 * Called when new spins are made to keep leaderboard fresh
 */
export async function invalidateLeaderboardCache() {
  try {
    await redis.del('leaderboard:7');
    await redis.del('leaderboard:30');
    console.log('🗑️ Leaderboard cache invalidated');
  } catch (error) {
    console.error('Failed to invalidate leaderboard cache:', error);
  }
}
