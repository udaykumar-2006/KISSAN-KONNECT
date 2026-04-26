const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  initOrGetChat,
  getUserBargains,
  getBargainById,
  addMessage,
} = require('../controllers/bargainController');

const router = express.Router();

router.use(protect);

// GET  /api/bargains          — list all bargains for logged-in user
router.get('/', getUserBargains);

// POST /api/bargains/init     — buyer initiates or resumes a chat (no duplicate)
router.post('/init', authorize('buyer'), initOrGetChat);

// GET  /api/bargains/:id      — get a specific bargain with messages
router.get('/:id', getBargainById);

// POST /api/bargains/:id/messages  — add message via HTTP (socket is primary)
router.post('/:id/messages', addMessage);

module.exports = router;