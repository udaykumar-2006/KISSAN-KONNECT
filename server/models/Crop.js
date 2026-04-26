const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmerName: { type: String, required: true }, // denormalized for quick access
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices'],
    required: true 
  },
  pricePerKg: { type: Number, required: true, min: 0 },
  minQuantityKg: { type: Number, required: true, min: 0 },
  availableQuantityKg: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String, required: true }, // Cloudinary URL
  harvestDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // for pause/unpause
  avgRating: { type: Number, default: 0 },
  numRatings: { type: Number, default: 0 }
}, { timestamps: true }); // adds createdAt and updatedAt

module.exports = mongoose.model('Crop', cropSchema);