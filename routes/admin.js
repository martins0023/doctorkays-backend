const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/authMiddleware');

// Admin registration (protected)
router.post('/register', adminAuth, adminController.registerAdmin);

// Admin login
router.post('/login', adminController.loginAdmin);

// Verify admin login (for multi-factor authentication)
router.post('/verify-login', adminController.verifyLogin);

// Get logged-in admin info (protected)
router.get('/me', adminAuth, adminController.getAdminProfile);

// Get admin stats (protected)
router.get('/stats', adminAuth, adminController.getAdminStats);

// PUT endpoint to update logged-in admin info
router.put('/me', adminAuth, adminController.putAdminInfo);

module.exports = router;
