// routes/consultationRoutes.js

const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationControllerTw');

// POST /api/consultations - Create a new consultation.
router.post('/consultations', consultationController.createConsultation);

// GET /api/consultations/:roomName - Validate (and fetch) a consultation record.
router.get('/consultations/:roomName', consultationController.validateConsultation);

// Route to validate consultation details before joining video session.
router.post('/consultations/validate', consultationController.validateConsultation);

// Route to fetch a consultation using the room name.
// router.get('/consultations/:roomName', consultationController.getConsultationByRoom);

// Route to update the status of a consultation (e.g., completed, expired).
// router.put('/consultations/:id/status', consultationController.updateConsultationStatus);

// routes/videoSessionRoutes.js

// Create a new video session record.
// router.post('/videosessions', consultationController.createVideoSession);

// Add a participant to an ongoing video session.
// router.post('/videosessions/:sessionId/participants', consultationController.addParticipant);

// Remove (or mark as left) a participant from a video session.
// router.put('/videosessions/:sessionId/participants', consultationController.removeParticipant);

// End a video session.
// router.put('/videosessions/:sessionId/end', consultationController.endVideoSession);

// Retrieve details of a specific video session.
// router.get('/videosessions/:sessionId', consultationController.getVideoSession);

// routes/consultationEventRoutes.js

// Create a new event log for a consultation.
// router.post('/consultation-events', consultationController.createConsultationEvent);

// Retrieve all event logs for a given consultation.
// router.get('/consultation-events/:consultationId', consultationController.getEventsByConsultation);

module.exports = router;