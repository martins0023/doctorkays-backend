const Doctor = require('../models/Doctor');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public (or auth if you prefer)
exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    next(err);
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res, next) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new doctor (for admin tools)
// @route   POST /api/doctors
// @access  Private/Admin
exports.createDoctor = async (req, res, next) => {
  try {
    const newDoc = new Doctor(req.body);
    const saved = await newDoc.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};
