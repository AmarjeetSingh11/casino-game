# 🎰 Casino Slot Game - Full Stack WebSocket Application

A modern, real-time casino slot game built with Node.js, React, Socket.IO, MongoDB, and Redis. Features WebSocket communication, authentication, rate limiting, caching, and comprehensive metrics tracking.

## 🚀 Features

### 🔐 Authentication & Security
- **JWT + Refresh Token Authentication**: Secure login/register with token-based auth
- **WebSocket Authentication**: All socket connections require valid access tokens
- **Session Management**: Tokens stored in Redis for secure session handling
- **Password Hashing**: Bcrypt encryption for user passwords

### ⚡ Real-Time Gameplay
- **WebSocket Communication**: All game interactions use Socket.IO (no REST APIs for gameplay)
- **Live Slot Machine**: Animated 3-reel slot machine with weighted random outcomes
- **Real-Time Balance Updates**: Instant balance updates after each spin
- **Live Transaction History**: Paginated spin history with real-time updates

### 🎮 Slot Game Features
- **6 Different Symbols**: 🍒 🍋 🍊 💎 7️⃣ 🎰 with weighted probabilities
- **Multiple Win Conditions**: 
  - 3 of a kind: 2x-100x multiplier (based on symbol rarity)
  - 2 of a kind: 1x multiplier
- **Animated Spinning**: Visual feedback with spinning animation
- **Win Celebrations**: Popup dialog for winning spins

### 🏆 Leaderboard System
- **Cached Leaderboards**: Redis-cached top players (2-minute cache)
- **Net Win Rankings**: Players ranked by net profit (wins - losses)
- **Time-based Filtering**: Configurable time periods (7 days, 30 days, etc.)
- **Auto-invalidation**: Cache cleared on new spins

### 🚨 Rate Limiting & Protection
- **Per-User Rate Limiting**: Configurable spins per time window
- **Redis-based Tracking**: Efficient rate limit enforcement
- **Graceful Error Handling**: User-friendly rate limit messages
- **Balance Validation**: Prevents overspending

### 📊 Metrics & Analytics
- **Comprehensive Tracking**: Total spins, wagers, wins, session duration
- **Real-Time Stats**: Live updates of player statistics
- **Session Analytics**: Session duration and engagement metrics
- **Win Rate Calculations**: Percentage-based performance metrics

### 🎨 Modern UI/UX
- **Material-UI Design**: Beautiful, responsive interface
- **Dark Theme**: Casino-appropriate dark color scheme
- **Responsive Layout**: Works on desktop and mobile devices
- **Interactive Elements**: Hover effects, animations, and visual feedback

## 🛠 Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for REST endpoints
- **Socket.IO** for real-time communication
- **MongoDB** with **Mongoose** for data persistence
- **Redis** for caching and session management
- **JWT** for authentication
- **Bcrypt** for password hashing

### Frontend
- **React 18** with **Vite**
- **Material-UI (MUI)** for UI components
- **Socket.IO Client** for real-time communication
- **Responsive Design** with CSS Grid and Flexbox

### Infrastructure
- **Docker Compose** for local development
- **MongoDB** containerized database
- **Redis** containerized cache
- **Environment-based configuration**

## 📦 Installation & Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd casino-game
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

### Local Development Setup

1. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Set up environment variables**
   Create `.env` files in both `backend/` and `frontend/` directories:
   ```env
   # Backend .env
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/casino
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your-super-secret-jwt-key
   REFRESH_SECRET=your-super-secret-refresh-key
   RATE_LIMIT_WINDOW=60
   RATE_LIMIT_SPINS=10
   ```

3. **Start services**
   ```bash
   # Start MongoDB and Redis (or use Docker)
   docker-compose up mongo redis -d
   
   # Backend
   cd backend
   npm run dev
   
   # Frontend (in new terminal)
   cd frontend
   npm run dev
   ```

## 🎯 API Documentation

### REST Endpoints

#### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/refresh` - Refresh access token

#### Leaderboard
- `GET /api/leaderboard?days=N` - Get top players (cached)

### WebSocket Events

#### Client → Server
- `balance` - Request current balance
- `spin` - Place a spin bet
- `transactions` - Get paginated spin history
- `metrics` - Get user metrics

#### Server → Client
- All events return callback with result/error

### Event Examples

```javascript
// Get balance
socket.emit('balance', (response) => {
  if (response.error) console.error(response.error);
  else console.log('Balance:', response.balance);
});

// Place spin
socket.emit('spin', { wager: 10 }, (response) => {
  if (response.error) console.error(response.error);
  else console.log('Spin result:', response);
});

// Get transactions
socket.emit('transactions', { page: 1, pageSize: 10 }, (response) => {
  if (response.error) console.error(response.error);
  else console.log('Transactions:', response.spins);
});
```

## 🎮 Game Rules

### Symbols & Payouts
- **🍒 Cherry**: 2x multiplier (25% chance)
- **🍋 Lemon**: 3x multiplier (25% chance)
- **🍊 Orange**: 4x multiplier (20% chance)
- **💎 Diamond**: 10x multiplier (15% chance)
- **7️⃣ Seven**: 25x multiplier (10% chance)
- **🎰 Slot**: 100x multiplier (5% chance)

### Win Conditions
- **Three of a kind**: Symbol multiplier × wager
- **Two of a kind**: 1x wager
- **No match**: No win

### Starting Balance
- New users start with $1000 virtual currency

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/casino` | MongoDB connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | `myjwtsecret` | JWT signing secret |
| `REFRESH_SECRET` | `myrefreshsecret` | Refresh token secret |
| `RATE_LIMIT_WINDOW` | `60` | Rate limit window in seconds |
| `RATE_LIMIT_SPINS` | `10` | Max spins per window |

### Docker Configuration
- **MongoDB**: Port 27017, persistent volume
- **Redis**: Port 6379, persistent volume
- **Backend**: Port 4000, hot reload enabled
- **Frontend**: Port 5173, hot reload enabled

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: String (hashed),
  createdAt: Date
}
```

### Spin Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  wager: Number,
  win: Number,
  outcome: [String],
  spinId: String (unique),
  createdAt: Date,
  metadata: {
    multiplier: Number,
    baseWin: Number
  }
}
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Use strong, unique secrets
2. **SSL/TLS**: Enable HTTPS for production
3. **Database**: Use managed MongoDB/Redis services
4. **Scaling**: Consider horizontal scaling for high traffic
5. **Monitoring**: Implement logging and monitoring
6. **Backup**: Regular database backups

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Future Enhancements

- [ ] Sound effects and music
- [ ] Multiple slot machine themes
- [ ] Progressive jackpots
- [ ] Tournament mode
- [ ] Social features (friends, chat)
- [ ] Mobile app (React Native)
- [ ] Admin dashboard
- [ ] Payment integration (for real money)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support

## 🐛 Troubleshooting

### Common Issues

1. **Connection refused**: Ensure MongoDB and Redis are running
2. **Authentication errors**: Check JWT secrets in environment
3. **Rate limiting**: Wait for rate limit window to reset
4. **Balance issues**: Check transaction history for discrepancies

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in backend environment.

---

**Enjoy playing! 🎰💰**
