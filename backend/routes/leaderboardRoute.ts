import express from 'express';
import { getLeaderboard } from '../controller/leaderboardController';

const router = express.Router();

// 🏆 Leaderboard endpoint
// GET /api/leaderboard?days=N - Returns top players ranked by net win
router.get('/leaderboard', getLeaderboard);

export default router;


