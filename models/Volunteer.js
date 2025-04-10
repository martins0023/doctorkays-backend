const mongoose = require('mongoose');

//volunteer connection
const VolunteerSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Volunteer", VolunteerSchema);