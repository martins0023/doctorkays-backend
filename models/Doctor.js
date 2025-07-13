const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user:      { type: String, required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, required: true },
  createdAt: { type: Date,   default: Date.now }
});

const doctorSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  specialty:      { type: String, required: true },
  image:          { type: String }, // store URL or file path
  category:       { type: String },
  location:       { type: String },
  about:          { type: String },
  available:      { type: Boolean, default: false },
  availableDates: [{ type: Date }],
  reviews:        [reviewSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);
