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

router.get("/", auth, async (req, res) => {
  try {
    // Fetch all users
    const users = await UserPatient.find().lean();

    // For each user, load their record if it exists
    const records = await Promise.all(
      users.map(async (u) => {
        const rec = await MedicalRecord.findOne({ user: u._id }).lean();
        return {
          userId: u._id,
          name: u.name,
          email: u.email,
          initialComplaint: rec?.initialComplaint || "",
          diagnosis: rec?.diagnosis || "",
          investigations: rec?.investigations || [],
          actionPlan: rec?.actionPlan || [],
          appointments: rec?.appointments || [],
          updatedAt: rec?.updatedAt || u.createdAt,
        };
      })
    );

    res.json(records);
  } catch (err) {
    console.error("Error listing users+records:", err);
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
