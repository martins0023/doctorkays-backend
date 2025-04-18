const express = require('express');
const router = express.Router();
const multer = require("multer"); // Import multer

const consultationController = require('../controllers/consultationController')
const adminAuth = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload  = multer({ storage })

//get consultation data
router.get('/consultations', consultationController.getConsultation);

// Endpoint for consultation details
router.post('/consultation', consultationController.addConsultation);

// DELETE consultation by ID
router.delete('/consultations/:id', consultationController.deleteConsultation);

//free-subscription endpoint consultation
router.post('/free-subscription', consultationController.addFreeConsultation);

//send confirmation email to subscriber
router.post('/sendConfirmationEmail', consultationController.consultationConfirmationEmail);

module.exports = router;