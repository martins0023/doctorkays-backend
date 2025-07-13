const express = require('express');
const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor
} = require('../controllers/doctorController');
const router = express.Router();

// Public
router.get('/',     getDoctors);
router.get('/:id',  getDoctorById);

// (Optional) Admin only
router.post('/',    createDoctor);
router.patch('/:id',  updateDoctor);

module.exports = router;
