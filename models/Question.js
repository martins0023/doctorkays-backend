const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: String,
  content: String,
  date: { type: Date, default: Date.now },
});

const questionSchema = new mongoose.Schema({
  user: String,
  title: String,
  question: String,
  hasDoctorReplied: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  comments: [commentSchema],
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', questionSchema);
