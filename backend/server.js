const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// AUTO CREATE ALL TABLES ON STARTUP
// ============================================
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        age INT,
        gender VARCHAR(20),
        bio TEXT,
        profile_picture TEXT,
        chat_theme VARCHAR(50) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS connections (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        connected_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS statuses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        image TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ All tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
};

initDB();

// ============================================
// ROUTES
// ============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/status', require('./routes/status'));

app.get('/', (req, res) => res.json({ status: 'Sync App Running ✅' }));

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    res.json({ 
      status: 'healthy', 
      tables: result.rows.map(r => r.table_name),
      database: process.env.DATABASE_URL ? 'connected' : 'missing'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SOCKET.IO - REAL TIME
// ============================================
const waitingUsers = [];

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('find_match', ({ userId }) => {
    socket.userId = userId;
    const partnerIndex = waitingUsers.findIndex(u => u.userId !== userId);
    if (partnerIndex !== -1) {
      const partner = waitingUsers.splice(partnerIndex, 1)[0];
      const room = `random_${socket.id}_${partner.socketId}`;
      socket.join(room);
      partner.socket.join(room);
      socket.currentRoom = room;
      partner.socket.currentRoom = room;
      socket.emit('matched', { partner: { id: partner.userId } });
      partner.socket.emit('matched', { partner: { id: userId } });
    } else {
      waitingUsers.push({ userId, socketId: socket.id, socket });
      socket.emit('waiting');
    }
  });

  socket.on('skip_match', ({ userId }) => {
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit('partner_left');
      socket.leave(socket.currentRoom);
      socket.currentRoom = null;
    }
    const index = waitingUsers.findIndex(u => u.userId === userId);
    if (index !== -1) waitingUsers.splice(index, 1);
  });

  socket.on('send_random_message', (data) => {
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit('receive_message', { text: data.text });
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit('partner_left');
    }
    const index = waitingUsers.findIndex(u => u.socketId === socket.id);
    if (index !== -1) waitingUsers.splice(index, 1);
    console.log('🔌 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});