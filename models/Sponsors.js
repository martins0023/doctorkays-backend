const mongoose = require('mongoose');

// define mongoose for sponsorship
const sponsorSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    price: String,
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Sponsor", sponsorSchema);