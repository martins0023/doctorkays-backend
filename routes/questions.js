const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/questionsController');
const adminAuth = require('../middleware/authMiddleware');

// Create a new question
router.post('/', questionsController.createQuestion);

// Update answer for a question (protected)
router.put('/:id/answer', questionsController.updateAnswer);

// Retrieve a single question by ID
router.get('/:id', questionsController.getQuestionById);

// Retrieve all questions
router.get('/', questionsController.getAllQuestions);

// Add a comment to a question
router.post('/:id/comments', questionsController.addComment);

// Update likes or dislikes
router.patch('/:id/reactions', questionsController.updateReactions);

module.exports = router;