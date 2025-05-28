// File: routes/medicalRecord.js
const express = require("express");
const MedicalRecord = require("../models/MedicalRecord");
const auth = require("../middleware/auth"); // ensure only admins or the user

const router = express.Router();

// Get a user's medical record
router.get("/:userId", async (req, res) => {
  const record = await MedicalRecord.findOne({ user: req.params.userId });
  if (!record) {
    return res.status(404).json({ message: "No record found." });
  }
  res.json(record);
});

router.get("/", async (req, res) => {
  try {
    const records = await MedicalRecord.find()
      .populate("user", "name email")
      .lean();
    res.json(records);
  } catch (err) {
    console.error("Error listing records:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// Admin updates record
router.patch("/:userId", async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = Date.now();
    const record = await MedicalRecord.findOneAndUpdate(
      { user: req.params.userId },
      updates,
      { new: true, upsert: true }
    ).populate("user", "name email");
    res.json(record);
  } catch (err) {
    console.error("Error updating record:", err);
    res.status(500).json({ message: "Server error." });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    await MedicalRecord.findOneAndDelete({ user: req.params.userId });
    res.json({ message: "Deleted." });
  } catch (err) {
    console.error("Error deleting record:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
