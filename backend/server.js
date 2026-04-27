const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const connectionRoutes = require('./routes/connections');
const statusRoutes = require('./routes/status');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// TEST DB ROUTE
app.get('/test-db', async (req, res) => {
  const pool = require('./db');
  try {
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/status', statusRoutes);

app.get('/', (req, res) => {
  res.send('Sync App Server Running!');
});

const waitingUsers = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
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
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});