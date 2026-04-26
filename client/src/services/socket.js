import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ── Singleton socket instance ──
// We create it lazily so the token is always fresh on connect.
let socket = null;

export const getSocket = () => {
  if (socket && socket.connected) return socket;

  const token = localStorage.getItem('kk_token');

  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { token }, // sent in handshake → server verifies JWT
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket.IO connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Socket.IO disconnected:', reason);
  });

  return socket;
};

// Disconnect and clear (call on logout)
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default getSocket;
