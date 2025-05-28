// File: models/MedicalRecord.js
const mongoose = require("mongoose");

const updateSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  text: String,
});

const appointmentSchema = new mongoose.Schema({
  date: Date,
  type: String, // e.g. "Initial appointment", "Follow-up"
});

const medicalRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserPatient", unique: true },
  initialComplaint: String,
  diagnosis: String,
  investigations: [String],
  actionPlan: [updateSchema],
  appointments: [appointmentSchema],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
