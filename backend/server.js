const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' }
});

app.use(limiter);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Apply auth rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Auto-create tables
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
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        creator_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INT REFERENCES groups(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        group_id INT REFERENCES groups(id) ON DELETE CASCADE,
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ All tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  }
};

initDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/status', require('./routes/status'));
app.use('/api/groups', require('./routes/groups'));

app.get('/', (req, res) => res.json({ status: '✅ Sync App Running', version: '2.0' }));

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    res.json({ status: 'healthy', tables: result.rows.map(r => r.table_name), timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io
const waitingUsers = [];

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  socket.on('join_room', (roomId) => socket.join(roomId));

  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });

  socket.on('find_match', ({ userId }) => {
    socket.userId = userId;
    const partnerIndex = waitingUsers.findIndex(u => u.userId !== userId);
    if (partnerIndex !== -1) {
      const partner = waitingUsers.splice(partnerIndex, 1)[0];
      const room = `random_${[socket.id, partner.socketId].sort().join('_')}`;
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
    const idx = waitingUsers.findIndex(u => u.userId === userId);
    if (idx !== -1) waitingUsers.splice(idx, 1);
  });

  socket.on('send_random_message', (data) => {
    if (socket.currentRoom) {
      io.to(socket.currentRoom).emit('receive_message', { text: data.text });
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom) io.to(socket.currentRoom).emit('partner_left');
    const idx = waitingUsers.findIndex(u => u.socketId === socket.id);
    if (idx !== -1) waitingUsers.splice(idx, 1);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));