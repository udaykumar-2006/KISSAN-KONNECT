const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getUsers,
  getOrders,
  getRevenueData,
  getBargains
} = require('../controllers/adminController');

const router = express.Router();

// Apply auth and admin check to all routes
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/orders', getOrders);
router.get('/revenue', getRevenueData);
router.get('/bargains', getBargains);

module.exports = router;
