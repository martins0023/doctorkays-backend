const mongoose = require('mongoose');

// Define a Mongoose schema for consultation bookings
const consultationSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    consultationType: String,
    price: String,
    story: String,
    reportFileUrl: String, // New field to store Cloudinary URL
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Consultation", consultationSchema);
