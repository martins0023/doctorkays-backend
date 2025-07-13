const express = require('express');
const {
  getDoctors,
  getDoctorById,
  createDoctor
} = require('../controllers/doctorController');
const router = express.Router();

// Public
router.get('/',     getDoctors);
router.get('/:id',  getDoctorById);

// (Optional) Admin only
router.post('/',    createDoctor);

module.exports = router;
