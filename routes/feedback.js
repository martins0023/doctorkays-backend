const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');


// GET endpoint for retrieving all feedbacks
router.get('/get', feedbackController.getAllFeedback);

//POST endpoint for saving feedbacks
router.post('/post', feedbackController.addFeedback);

module.exports = router;