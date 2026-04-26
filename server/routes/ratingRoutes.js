const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  rateCrop,
  rateFarmer,
  rateBuyer,
  getCropRatings,
  getFarmerRatings,
  getBuyerRatings,
  getMyRatings
} = require('../controllers/ratingController');

const router = express.Router();

// Public routes
router.get('/crop/:cropId', getCropRatings);
router.get('/farmer/:farmerId', getFarmerRatings);
router.get('/buyer/:buyerId', getBuyerRatings);

// Protected routes
router.use(protect);
router.get('/my', getMyRatings);
router.post('/crop', authorize('buyer'), rateCrop);
router.post('/farmer', authorize('buyer'), rateFarmer);
router.post('/buyer', authorize('farmer'), rateBuyer);

module.exports = router;