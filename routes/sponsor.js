const express = require('express');
const router = express.Router();
const sponsorController = require('../controllers/sponsorController');

//GET ENDPOINT data
router.get('/sponsors', sponsorController.getAllSponsors);

//POST ENDPOINT DATA
router.post('/sponsor', sponsorController.addSponsor);

module.exports = router;