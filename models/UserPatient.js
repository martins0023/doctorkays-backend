const mongoose = require("mongoose");

const userPatientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  },
  password: { type: String, required: true },

  // New fields for email verification:
  emailVerified:           { type: Boolean, default: false },
  emailVerificationToken:  { type: String },
  emailVerificationExpires:{ type: Date },

  resetPasswordToken:   String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserPatient", userPatientSchema);
