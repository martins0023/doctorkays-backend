const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');


// GET endpoint for retrieving all enquiry
router.get('/get', enquiryController.getAllEnquiries);

//POST endpoint for saving enquiries
router.post('/post', enquiryController.addEnquiry);

module.exports = router;