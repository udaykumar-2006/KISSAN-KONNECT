import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kk_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Global 401 handler
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/change-password')) {
      localStorage.removeItem('kk_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const login          = (data)   => API.post('/auth/login', data);
export const signup         = (data)   => API.post('/auth/signup', data);
export const getProfile     = ()       => API.get('/auth/profile');
export const updateProfile  = (data)   => API.put('/auth/profile', data);
export const changePassword = (data)   => API.put('/auth/change-password', data);

// ── Crops ─────────────────────────────────────────────────
export const getCrops        = (params) => API.get('/crops/', { params });
export const getMyCrops      = ()       => API.get('/crops/my-crops');
export const getCrop         = (id)     => API.get(`/crops/one/${id}`);
export const createCrop      = (fd)     => API.post('/crops', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateCrop      = (id, fd) => API.put(`/crops/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteCrop      = (id)     => API.delete(`/crops/${id}`);
export const togglePauseCrop = (id)     => API.patch(`/crops/${id}/pause`);

// ── Bargains ──────────────────────────────────────────────
export const getBargains        = ()             => API.get('/bargains');
export const getBargain         = (id)           => API.get(`/bargains/${id}`);
/** Buyer initiates OR resumes chat for a crop — prevents duplicate chats */
export const initBargainChat    = (data)         => API.post('/bargains/init', data);  // { cropId }
/** HTTP fallback for sending a message (socket is primary) */
export const sendBargainMessage = (bargainId, d) => API.post(`/bargains/${bargainId}/messages`, d);

// ── Orders ────────────────────────────────────────────────
export const getOrders              = ()                          => API.get('/orders');
export const getOrder               = (id)                        => API.get(`/orders/${id}`);
export const getOrderByBargainId    = (bargainId)                 => API.get(`/orders/by-bargain/${bargainId}`);
export const createOrderFromBargain = (bargainId, data)           => API.post(`/orders/from-bargain/${bargainId}`, data);
export const submitOrderAddress     = (id, addressData)           => API.patch(`/orders/${id}/address`, addressData);
export const updateOrderStatus      = (id, status)                => API.patch(`/orders/${id}/status`, { status });
export const recordPayment          = (id, type, extra)           => API.patch(`/orders/${id}/payment`, { type, ...extra });

// ── Payments ──────────────────────────────────────────────
export const createPaymentOrder     = (data)                      => API.post('/payment/create-order', data);
export const verifyPayment          = (data)                      => API.post('/payment/verify', data);
// ── Ratings ───────────────────────────────────────────────
export const rateCrop        = (data)    => API.post('/ratings/crop', data);
export const rateFarmer      = (data)    => API.post('/ratings/farmer', data);
export const rateBuyer       = (data)    => API.post('/ratings/buyer', data);
export const getCropRatings  = (cropId)  => API.get(`/ratings/crop/${cropId}`);
export const getFarmerRatings = (farmerId) => API.get(`/ratings/farmer/${farmerId}`);
export const getBuyerRatings = (buyerId) => API.get(`/ratings/buyer/${buyerId}`);
export const getMyRatings    = ()        => API.get('/ratings/my');

// ── Notifications ─────────────────────────────────────────
export const getNotifications     = ()    => API.get('/notifications');
export const getUnreadCount       = ()    => API.get('/notifications/unread-count');
export const markNotificationRead = (id)  => API.patch(`/notifications/${id}/read`);
export const markAllRead          = ()    => API.patch('/notifications/read-all');