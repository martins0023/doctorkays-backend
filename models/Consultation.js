const mongoose = require("mongoose");

// Define a Mongoose schema for consultation bookings
const consultationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  consultationType: String,
  price: String,
  story: String,
  reportFileUrl: String, // the Cloudinary URL with attachment flag
  reportFileName: String, // original filename, e.g. "report.pdf"
  reportFileExtension: String, // e.g. ".pdf"
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Consultation", consultationSchema);
