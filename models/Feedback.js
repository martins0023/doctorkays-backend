const mongoose = require('mongoose');

//feedback connection
const FeedbackSchema = new mongoose.Schema({
    name: String,
    comments: String,
    createdAt: { type: Date, default: Date.now },
  });
  
module.exports = mongoose.model("Feedback", FeedbackSchema);