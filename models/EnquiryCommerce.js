const mongoose = require('mongoose');

//enquiry connection
const EnquirySchema = new mongoose.Schema({
    fullname: String,
    enquiry: String,
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Enquiry", EnquirySchema);