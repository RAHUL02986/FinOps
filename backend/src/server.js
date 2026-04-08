// Start recurring expense reminder cron job
require('./scheduler/recurringExpenseReminder.cron');

// Start lead alerts cron jobs
const { 
  scheduleHighPriorityAlerts, 
  scheduleOverdueFollowUps, 
  scheduleHotLeadAlerts 
} = require('./scheduler/leadAlerts.cron');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

const connectDB = require('./config/database');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Initialize lead alert cron jobs
scheduleHighPriorityAlerts();
scheduleOverdueFollowUps();
scheduleHotLeadAlerts();

// Security & parsing middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (auth enforced at the route level)
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/income', require('./routes/income'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/export-users', require('./routes/exportUsers'));
app.use('/api/dashboard', require('./routes/dashboard'));


// app.use('/api/inventory', require('./routes/inventory'));

// app.use('/api/projects', require('./routes/projects'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/categories', require('./routes/categories'));

app.use('/api/notification-preferences', require('./routes/notificationPreferences'));
app.use('/api/notifications', require('./routes/notifications'));



app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/settings/smtp', require('./routes/settings'));
app.use('/api/recurring-expenses', require('./routes/recurringExpenses'));
app.use('/api/recurring-expenses', require('./routes/recurringExpenses.reminder'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/company', require('./routes/company'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/leads', require('./routes/leads'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Remove duplicate app.listen - server.listen handles HTTP

// Socket.io Chat Server
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');





const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.engine.on('connection_error', (err) => {
  console.error('Socket engine connection error:', err.req?.url, err.code, err.message);
});

// Socket.io AUTH middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token provided'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name');
    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('=== SOCKET CONNECTION ===', socket.id);
  console.log(`User ${socket.userId} (${socket.user.name}) connected`);

  // Track online users per group
  socket.on('joinGroup', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`${socket.userId} joined group ${groupId}`);
    // Notify room of online users
    const room = io.sockets.adapter.rooms.get(`group_${groupId}`);
    const onlineUsers = Array.from(room || []).map(id => io.sockets.sockets.get(id)?.userId || id);
    socket.to(`group_${groupId}`).emit('onlineUsers', onlineUsers);
  });

  socket.on('joinPrivate', (otherUserId) => {
    const ids = [socket.userId, otherUserId].sort();
    const room = `private_${ids[0]}_${ids[1]}`;
    socket.join(room);
    console.log(`${socket.userId} joined private room ${room}`);
    socket.to(room).emit('onlineUsers', [socket.userId]);
  });

  socket.on('typing', (room) => {
    socket.to(room).emit('userTyping', socket.userId);
  });

  socket.on('stopTyping', (room) => {
    socket.to(room).emit('userStopTyping', socket.userId);
  });

  // Group chat
  socket.on('joinGroup', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // Send message (ephemeral)
  socket.on('sendMessage', async ({ room, groupId, message, mentions }) => {
    try {
      // Save to DB first
      let parsedGroupId = null;
      if (groupId) {
        try {
          parsedGroupId = new mongoose.Types.ObjectId(groupId);
        } catch (idErr) {
          console.error('Invalid groupId:', groupId, idErr);
        }
      }
      const chatMsg = await ChatMessage.create({
        room,
        groupId: parsedGroupId,
        from: socket.userId,
        message,
        mentions,
        status: 'sent'
      });

      // Update to delivered after broadcast
      setTimeout(async () => {
        await ChatMessage.findByIdAndUpdate(chatMsg._id, { status: 'delivered' });
      }, 100);

      // Broadcast with full message data + timestamp
      const broadcastMsg = {
        _id: chatMsg._id,
        room,
        groupId,
        from: socket.userId,
        message,
        mentions,
        status: 'delivered',
        timestamp: chatMsg.createdAt.getTime(),
        createdAt: chatMsg.createdAt
      };

      const targetRoom = room || `group_${groupId}`;
      if (targetRoom) {
        socket.to(targetRoom).emit('newMessage', broadcastMsg);
        socket.emit('messageDelivered', chatMsg._id);
      }
    } catch (err) {
      console.error(`Chat save error for user ${socket.userId}:`, err);
      socket.emit('error', { message: 'Failed to send message' });
    }

  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    // Notify rooms of user offline
    Object.keys(socket.rooms).forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('userOffline', socket.userId);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server + Socket.IO on port ${PORT}`);
});

