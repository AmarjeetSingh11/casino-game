import React from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  Avatar,
  Badge
} from '@mui/material';
import {
  Casino,
  AccountBalance,
  History,
  Leaderboard,
  Analytics,
  Logout,
  Refresh,
  PlayArrow,
  Stop,
  TrendingUp,
  Timer,
  AttachMoney,
  Casino as CasinoIcon
} from '@mui/icons-material';

// 🔌 Socket.IO client instance - connects to backend WebSocket server
// AutoConnect is false to allow manual connection after authentication
const socket = io('http://localhost:4000', { autoConnect: false });

// 🎨 Custom theme configuration for casino-style dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff6b35', // Casino orange
    },
    secondary: {
      main: '#f7931e', // Gold accent
    },
    background: {
      default: '#0a0a0a', // Dark background
      paper: '#1a1a1a', // Slightly lighter paper
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  // --- 🔐 AUTHENTICATION STATE ---
  const [view, setView] = React.useState('login'); // Current view: login, register, or game
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  // 💾 Load tokens from localStorage on component mount
  const [accessToken, setAccessToken] = React.useState(() => {
    const savedToken = localStorage.getItem('accessToken');
    return savedToken || '';
  });
  const [refreshToken, setRefreshToken] = React.useState(() => {
    const savedToken = localStorage.getItem('refreshToken');
    return savedToken || '';
  });
  
  // --- 💰 GAME STATE ---
  const [balance, setBalance] = React.useState(null); // User's current balance
  const [spinResult, setSpinResult] = React.useState(null); // Latest spin result
  const [wager, setWager] = React.useState(10); // Current wager amount
  const [transactions, setTransactions] = React.useState([]); // Spin history
  const [leaderboard, setLeaderboard] = React.useState([]); // Leaderboard data
  const [metrics, setMetrics] = React.useState(null); // User metrics/statistics
  
  // --- 🎮 UI STATE ---
  const [error, setError] = React.useState(''); // Error messages
  const [loading, setLoading] = React.useState(true); // Loading states - start with true for auth check
  const [spinning, setSpinning] = React.useState(false); // Spin animation state
  const [page, setPage] = React.useState(1); // Pagination for transactions
  const [drawerOpen, setDrawerOpen] = React.useState(false); // Sidebar drawer
  const [activeTab, setActiveTab] = React.useState(0); // Active tab in drawer
  const [showWinDialog, setShowWinDialog] = React.useState(false); // Win celebration dialog
  const [reels, setReels] = React.useState(['🎰', '🎰', '🎰']); // Slot machine reels display
  const pageSize = 10; // Items per page for pagination

  // 🔄 Check if user is already logged in on app start
  React.useEffect(() => {
    const checkAuthStatus = async () => {
      const savedAccessToken = localStorage.getItem('accessToken');
      const savedRefreshToken = localStorage.getItem('refreshToken');
      
      if (savedAccessToken && savedRefreshToken) {
        // User has tokens, try to validate them
        await validateAndRefreshTokens(savedAccessToken, savedRefreshToken);
      }
      
      // Set loading to false after auth check
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // 🔐 Validate and refresh tokens if needed
  const validateAndRefreshTokens = async (accessToken, refreshToken) => {
    try {
      console.log('🔐 Validating tokens...');
      
      // First try to use the access token
      const response = await fetch('http://localhost:4000/api/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Access token is valid');
        // Access token is still valid
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setView('game');
        return;
      }
      
      console.log('🔄 Access token expired, trying to refresh...');
      // Access token expired, try to refresh
      const refreshResponse = await fetch('http://localhost:4000/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        console.log('✅ Tokens refreshed successfully');
        // Save new tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setView('game');
      } else {
        console.log('❌ Token refresh failed');
        // Refresh failed, clear tokens and show login
        clearTokens();
        setView('login');
      }
    } catch (err) {
      console.error('❌ Token validation failed:', err);
      // If it's a network error (backend not running), keep the tokens but show login
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        console.log('🌐 Backend not available, keeping tokens for now');
        // Don't clear tokens if it's just a network error
        setView('login');
      } else {
        clearTokens();
        setView('login');
      }
    }
  };

  // 🗑️ Clear tokens from localStorage and state
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken('');
    setRefreshToken('');
  };

  // --- 🔌 WEBSOCKET CONNECTION WITH AUTHENTICATION ---
  React.useEffect(() => {
    if (accessToken) {
      // Set authentication token for WebSocket connection
      socket.auth = { token: accessToken };
      socket.connect();
      
      // Handle connection errors
      socket.on('connect_error', (err) => {
        setError('Connection error: ' + err.message);
      });
      
      // Handle successful connection
      socket.on('connect', () => {
        // Fetch initial data on connection
        fetchBalance();
        fetchTransactions(1);
        fetchMetrics();
        fetchLeaderboard();
      });
      
      // Cleanup on unmount
      return () => {
        socket.off('connect_error');
        socket.off('connect');
        socket.disconnect();
      };
    }
  }, [accessToken]);

  // --- 🔐 AUTHENTICATION HANDLERS ---
  
  /**
   * Handle user login
   * Sends credentials to backend and receives JWT tokens
   */
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        // 💾 Store tokens in localStorage for persistence
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // Store tokens and switch to game view
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setView('game');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  }

  /**
   * Handle user registration
   * Creates new user account
   */
  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setView('login');
        setError('Registration successful! Please log in.');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  }

  // --- 🎮 GAME ACTIONS ---
  
  /**
   * Fetch user's current balance via WebSocket
   * Calculated as: 1000 (initial) + total wins - total wagers
   */
  function fetchBalance() {
    socket.emit('balance', (res) => {
      if (res.error) setError(res.error);
      else setBalance(res.balance);
    });
  }

  /**
   * Fetch paginated spin history via WebSocket
   * @param {number} pageNum - Page number for pagination
   */
  function fetchTransactions(pageNum) {
    socket.emit('transactions', { page: pageNum, pageSize }, (res) => {
      if (res.error) setError(res.error);
      else {
        setTransactions(res.spins || []);
        setPage(pageNum);
      }
    });
  }

  /**
   * Fetch user metrics via WebSocket
   * Includes: total spins, wagers, wins, session duration
   */
  function fetchMetrics() {
    socket.emit('metrics', (res) => {
      if (res.error) setError(res.error);
      else setMetrics(res);
    });
  }

  /**
   * Fetch leaderboard data via REST API
   * Cached in Redis for 2 minutes on backend
   */
  async function fetchLeaderboard() {
    try {
      const res = await fetch('http://localhost:4000/api/leaderboard?days=7');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      setError('Failed to fetch leaderboard');
    }
  }

  /**
   * Handle slot machine spin
   * Includes animation and WebSocket communication
   */
  function handleSpin(e) {
    e.preventDefault();
    if (spinning) return; // Prevent multiple spins
    
    setSpinning(true);
    setError('');
    setSpinResult(null);
    
    // 🎰 Animate reels for visual feedback
    const symbols = ['🍒', '🍋', '🍊', '💎', '7️⃣', '🎰'];
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
      spinCount++;
      if (spinCount > 10) {
        clearInterval(spinInterval);
        // Send actual spin to backend via WebSocket
        socket.emit('spin', { wager: Number(wager) }, (res) => {
          setSpinning(false);
          if (res.error) {
            setError(res.error);
          } else {
            setSpinResult(res);
            setReels(res.outcome);
            setBalance(res.balance);
            // Refresh data after spin
            fetchTransactions(1);
            fetchMetrics();
            fetchLeaderboard();
            
            // Show win celebration if won
            if (res.win > 0) {
              setShowWinDialog(true);
            }
          }
        });
      }
    }, 100);
  }

  /**
   * Handle user logout
   * Clears all state and disconnects WebSocket
   */
  function handleLogout() {
    // 🗑️ Clear tokens from localStorage
    clearTokens();
    
    // Clear all state
    setBalance(null);
    setSpinResult(null);
    setTransactions([]);
    setLeaderboard([]);
    setMetrics(null);
    setView('login');
    socket.disconnect();
  }

  // --- 🎨 UI COMPONENTS ---
  
  // Loading screen while checking authentication
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            p: 2
          }}
        >
          <CasinoIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
            Casino Slot Game
          </Typography>
          <CircularProgress size={40} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" sx={{ color: 'white', mt: 2 }}>
            Loading...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }
  
  // Login view
  if (view === 'login') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
        >
          <Paper
            elevation={24}
            sx={{
              p: 4,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <CasinoIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              Casino Slot Game
            </Typography>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                required
                sx={{ '& .MuiInputLabel-root': { color: 'white' } }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                sx={{ '& .MuiInputLabel-root': { color: 'white' } }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
            </form>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setView('register')}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Register
            </Button>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  // Register view
  if (view === 'register') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
        >
          <Paper
            elevation={24}
            sx={{
              p: 4,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <CasinoIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              Register
            </Typography>
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                required
                sx={{ '& .MuiInputLabel-root': { color: 'white' } }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                sx={{ '& .MuiInputLabel-root': { color: 'white' } }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
            </form>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setView('login')}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Back to Login
            </Button>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  // --- 🎮 MAIN GAME VIEW ---
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* App Bar with balance display and navigation */}
        <AppBar position="static">
          <Toolbar>
            <CasinoIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Casino Slot Game
            </Typography>
            {/* 💰 Real-time balance display */}
            <Chip
              icon={<AccountBalance />}
              label={`$${balance !== null ? balance.toFixed(2) : '...'}`}
              color="secondary"
              sx={{ mr: 2 }}
            />
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
              <Analytics />
            </IconButton>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Main Content Area */}
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
          <Grid container spacing={3}>
            {/* 🎰 Slot Machine Section */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={8}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                  border: '2px solid #ff6b35'
                }}
              >
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                  🎰 Slot Machine 🎰
                </Typography>
                
                {/* Reels Display - Shows current symbols */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 2,
                    mb: 4,
                    p: 3,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 2,
                    border: '2px solid #333'
                  }}
                >
                  {reels.map((symbol, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '3rem',
                        background: 'linear-gradient(145deg, #3a3a3a, #2a2a2a)',
                        borderRadius: 2,
                        border: '2px solid #555',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                        animation: spinning ? 'spin 0.1s linear infinite' : 'none'
                      }}
                    >
                      {symbol}
                    </Box>
                  ))}
                </Box>

                {/* Spin Controls - Wager input and spin button */}
                <form onSubmit={handleSpin}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                    <TextField
                      label="Wager Amount"
                      type="number"
                      value={wager}
                      onChange={(e) => setWager(e.target.value)}
                      inputProps={{ min: 1, max: balance || 1000 }}
                      sx={{ width: 150 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={spinning || loading}
                      startIcon={spinning ? <CircularProgress size={20} /> : <PlayArrow />}
                      sx={{
                        py: 1.5,
                        px: 4,
                        background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #e55a2b, #e0851a)'
                        }
                      }}
                    >
                      {spinning ? 'Spinning...' : 'SPIN!'}
                    </Button>
                  </Box>
                </form>

                {/* Spin Result Display */}
                {spinResult && (
                  <Card sx={{ mt: 3, background: 'rgba(255,255,255,0.05)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Spin Result
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Wager: ${spinResult.wager}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Win: ${spinResult.win}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Multiplier: {spinResult.multiplier}x
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Balance: ${spinResult.balance?.toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Paper>
            </Grid>

            {/* 📊 Sidebar with Quick Stats */}
            <Grid item xs={12} md={4}>
              <Paper elevation={4} sx={{ p: 3, height: 'fit-content' }}>
                <Typography variant="h6" gutterBottom>
                  Quick Stats
                </Typography>
                {metrics && (
                  <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Spins
                        </Typography>
                        <Typography variant="h6">
                          {metrics.totalSpins}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Wagered
                        </Typography>
                        <Typography variant="h6">
                          ${metrics.totalWagered}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Total Won
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          ${metrics.totalWon}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Net Profit
                        </Typography>
                        <Typography variant="h6" color={metrics.totalWon - metrics.totalWagered >= 0 ? 'success.main' : 'error.main'}>
                          ${(metrics.totalWon - metrics.totalWagered).toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                {/* Navigation buttons */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={fetchLeaderboard}
                  startIcon={<Leaderboard />}
                  sx={{ mb: 2 }}
                >
                  View Leaderboard
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveTab(1)}
                  startIcon={<History />}
                >
                  View History
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* 📊 Drawer for detailed analytics */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: { width: 400 }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Game Analytics
            </Typography>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Leaderboard" />
              <Tab label="History" />
              <Tab label="Metrics" />
            </Tabs>
            
            <Box sx={{ mt: 2 }}>
              {/* 🏆 Leaderboard Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Top Players (7 days)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Player</TableCell>
                          <TableCell>Net Win</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaderboard.map((player, index) => (
                          <TableRow key={player._id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{player.username}</TableCell>
                            <TableCell color={player.netWin >= 0 ? 'success.main' : 'error.main'}>
                              ${player.netWin.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              
              {/* 📜 History Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Spin History
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      onClick={() => fetchTransactions(page - 1)}
                      disabled={page <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      size="small"
                      onClick={() => fetchTransactions(page + 1)}
                      sx={{ ml: 1 }}
                    >
                      Next
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Outcome</TableCell>
                          <TableCell>Wager</TableCell>
                          <TableCell>Win</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.spinId}>
                            <TableCell>{tx.outcome?.join(' ')}</TableCell>
                            <TableCell>${tx.wager}</TableCell>
                            <TableCell color={tx.win > 0 ? 'success.main' : 'text.secondary'}>
                              ${tx.win}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              
              {/* 📈 Metrics Tab */}
              {activeTab === 2 && metrics && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Detailed Metrics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">
                            Session Duration
                          </Typography>
                          <Typography variant="h6">
                            {Math.floor(metrics.sessionDuration / 1000)}s
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">
                            Total Spins
                          </Typography>
                          <Typography variant="h6">
                            {metrics.totalSpins}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">
                            Win Rate
                          </Typography>
                          <Typography variant="h6">
                            {metrics.totalSpins > 0 ? ((metrics.totalWon / metrics.totalWagered) * 100).toFixed(1) : 0}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          </Box>
        </Drawer>

        {/* 🎉 Win Celebration Dialog */}
        <Dialog open={showWinDialog} onClose={() => setShowWinDialog(false)}>
          <DialogTitle>🎉 Congratulations! 🎉</DialogTitle>
          <DialogContent>
            <Typography variant="h4" color="success.main" align="center">
              You won ${spinResult?.win}!
            </Typography>
            <Typography variant="body1" align="center" sx={{ mt: 2 }}>
              Multiplier: {spinResult?.multiplier}x
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowWinDialog(false)}>Continue Playing</Button>
          </DialogActions>
        </Dialog>

        {/* 🚨 Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
      </Box>

      {/* 🎰 Spin Animation CSS */}
      <style>
        {`
          @keyframes spin {
            0% { transform: translateY(-10px); }
            50% { transform: translateY(10px); }
            100% { transform: translateY(-10px); }
          }
        `}
      </style>
    </ThemeProvider>
  );
}

// 🔧 Create React root only once
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Check if root already exists to prevent duplicate createRoot calls
if (!rootElement._reactRootContainer) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
