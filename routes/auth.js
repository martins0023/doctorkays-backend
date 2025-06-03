const express = require("express");
const router = express.Router();
const { signup, signin, googleOAuth, forgotPassword, resetPassword, verifyEmail } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/google", googleOAuth);
router.post("/forgot", forgotPassword);
router.post("/reset",  resetPassword);
router.get("/verify-email", verifyEmail); // ← new GET

module.exports = router;
