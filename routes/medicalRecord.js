// File: routes/medicalRecord.js
const express = require("express");
const MedicalRecord = require("../models/MedicalRecord");
const auth = require("../middleware/auth"); // ensure only admins or the user

const router = express.Router();

// Get a user's medical record
router.get("/:userId", auth, async (req, res) => {
  const record = await MedicalRecord.findOne({ user: req.params.userId });
  if (!record) {
    return res.status(404).json({ message: "No record found." });
  }
  res.json(record);
});

// Admin updates record
router.patch("/:userId", auth, async (req, res) => {
  // validate req.body as needed…
  const updates = req.body;
  updates.updatedAt = Date.now();
  const record = await MedicalRecord.findOneAndUpdate(
    { user: req.params.userId },
    updates,
    { new: true, upsert: true }
  );
  res.json(record);
});

module.exports = router;
