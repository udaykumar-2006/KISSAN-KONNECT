const dotenv  = require('dotenv');
dotenv.config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const connectDB = require('./config/db');

const authRoutes          = require('./routes/authRoutes');
const cropRoutes          = require('./routes/cropRoutes');
const bargainRoutes       = require('./routes/bargainRoutes');
const orderRoutes         = require('./routes/orderRoutes');
const ratingRoutes        = require('./routes/ratingRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const adminRoutes         = require('./routes/adminRoutes');
const socketHandler       = require('./socket');

connectDB();

const app    = express();
const server = http.createServer(app);

// ── CORS — must be configured BEFORE socket handler and routes ──
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite dev server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// ── Socket.IO (shares same http server, passes CORS) ──
socketHandler(server);

// ── API Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/crops',         cropRoutes);
app.use('/api/bargains',      bargainRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/ratings',       ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment',       paymentRoutes);
app.use('/api/admin',         adminRoutes);

app.get('/', (_req, res) => res.send('🌾 Kissan Konnect API is running...'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));