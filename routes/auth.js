const express = require("express");
const router = express.Router();
const { signup, signin, googleOAuth } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/google", googleOAuth);

module.exports = router;
