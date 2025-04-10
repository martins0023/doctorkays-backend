const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');


// GET endpoint for retrieving all contacts
router.get('/contacts', contactController.getAllContacts);

//POST endpoint for saving contacts
router.post('/contact', contactController.addContacts);

module.exports = router;