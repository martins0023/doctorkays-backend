const mongoose = require('mongoose');

//contact connection
const ContactSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    message: String,
    services: [String], // an array of strings
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Contact", ContactSchema);