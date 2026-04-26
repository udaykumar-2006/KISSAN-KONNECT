const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { processNewMessage, setIo: setBargainIo } = require('./controllers/bargainController');
const { setIo: setOrderIo } = require('./controllers/orderController');

const socketHandler = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // ── Share io instance with both controllers ──
  setBargainIo(io);
  setOrderIo(io);

  // ── JWT Auth Middleware for Socket ──
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user; // attach user to socket
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} | User: ${socket.user?.name}`);

    // ──────────────────────────────────────────────────
    // Join a bargain/order room
    // roomId format: bargain._id
    // Used for both bargain messages AND order real-time updates
    // ──────────────────────────────────────────────────
    socket.on('join_room', ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`📦 ${socket.user.name} joined room: ${roomId}`);
    });

    // ──────────────────────────────────────────────────
    // Send a bargain message (offer / counter / accept / reject)
    // ──────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { bargainId, roomId, type, pricePerKg, quantityKg, message } = data;

        if (!bargainId || !type) {
          return socket.emit('error_message', { message: 'bargainId and type are required' });
        }

        const result = await processNewMessage({
          bargainId,
          type,
          pricePerKg: Number(pricePerKg) || 0,
          quantityKg:  Number(quantityKg)  || 0,
          message:     message || '',
          userId:      socket.user._id,
          userName:    socket.user.name,
        });

        const { bargain, order } = result;
        const latestMsg = bargain.messages[bargain.messages.length - 1];

        // Emit to everyone in the room (including sender — for confirmation)
        const emitRoomId = roomId || bargain._id.toString();
        io.to(emitRoomId).emit('receive_message', {
          bargainId:           bargain._id,
          message:             latestMsg,
          status:              bargain.status,
          lastSenderRole:      bargain.lastSenderRole,      // ← turn management
          availableQuantityKg: bargain.availableQuantityKg, // ← stock refresh
          finalPrice:          bargain.finalPrice,
          finalQuantity:       bargain.finalQuantity,
          orderId:             order?._id || null,
          advanceAmount:       order?.advanceAmount || null,
        });

        // If bargain accepted, emit dedicated event with full order details
        if (bargain.status === 'accepted') {
          io.to(emitRoomId).emit('bargain_accepted', {
            bargainId:      bargain._id,
            finalPrice:     bargain.finalPrice,
            finalQuantity:  bargain.finalQuantity,
            orderId:        order?._id,
            advanceAmount:  order?.advanceAmount,
            remainingAmount:order?.remainingAmount,
            totalPrice:     order?.totalPrice,
          });
        }

        if (bargain.status === 'rejected') {
          io.to(emitRoomId).emit('bargain_rejected', { bargainId: bargain._id });
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
        socket.emit('error_message', { message: err.message });
      }
    });

    // ──────────────────────────────────────────────────
    // Typing indicator (optional UX enhancement)
    // ──────────────────────────────────────────────────
    socket.on('typing', ({ roomId }) => {
      if (roomId) {
        socket.to(roomId).emit('user_typing', { userName: socket.user.name });
      }
    });

    socket.on('stop_typing', ({ roomId }) => {
      if (roomId) {
        socket.to(roomId).emit('user_stop_typing');
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id} | User: ${socket.user?.name}`);
    });
  });

  return io;
};

module.exports = socketHandler;
