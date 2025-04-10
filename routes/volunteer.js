const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController')

//volunteer endpoint
//GET ENDPOINT data
router.get('/volunteers', volunteerController.getAllVolunteers);

//post endpoint for saving volunteer data
router.post('/volunteer', volunteerController.addVolunteers);

module.exports = router;