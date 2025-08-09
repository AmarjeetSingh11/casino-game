// Simple test script to verify backend functionality
const io = require('socket.io-client');

async function testBackend() {
  console.log('🧪 Testing Casino Slot Game Backend...\n');

  // Test 1: Check if server is running
  try {
    const response = await fetch('http://localhost:4000/api/leaderboard?days=7');
    if (response.ok) {
      console.log('✅ Server is running and responding');
    } else {
      console.log('❌ Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot connect to server:', error.message);
    return;
  }

  // Test 2: Test registration
  try {
    const registerResponse = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'testpass' })
    });
    
    if (registerResponse.ok) {
      console.log('✅ User registration works');
    } else {
      const data = await registerResponse.json();
      console.log('⚠️  Registration response:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Registration test failed:', error.message);
  }

  // Test 3: Test login
  try {
    const loginResponse = await fetch('http://localhost:4000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'testpass' })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ User login works');
      
      // Test 4: Test WebSocket connection
      const socket = io('http://localhost:4000', {
        auth: { token: data.accessToken }
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connection established');
        
        // Test balance
        socket.emit('balance', (res) => {
          if (res.error) {
            console.log('❌ Balance test failed:', res.error);
          } else {
            console.log('✅ Balance retrieval works:', res.balance);
          }
        });

        // Test metrics
        socket.emit('metrics', (res) => {
          if (res.error) {
            console.log('❌ Metrics test failed:', res.error);
          } else {
            console.log('✅ Metrics retrieval works');
          }
        });

        // Test spin
        socket.emit('spin', { wager: 10 }, (res) => {
          if (res.error) {
            console.log('❌ Spin test failed:', res.error);
          } else {
            console.log('✅ Spin functionality works:', res.outcome);
          }
          
          // Test transactions
          socket.emit('transactions', { page: 1, pageSize: 5 }, (res) => {
            if (res.error) {
              console.log('❌ Transactions test failed:', res.error);
            } else {
              console.log('✅ Transaction history works');
            }
            
            socket.disconnect();
            console.log('\n🎉 All tests completed!');
          });
        });
      });

      socket.on('connect_error', (error) => {
        console.log('❌ WebSocket connection failed:', error.message);
      });

    } else {
      const data = await loginResponse.json();
      console.log('❌ Login test failed:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }
}

// Run tests
testBackend().catch(console.error);


