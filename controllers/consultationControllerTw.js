// controllers/consultationController.js

const Consultation = require('../models/ConsultationCreation');
// const ConsultationEvent = require('../models/ConsultationEvent');
// const VideoSession = require('../models/videoSession');

/**
 * Create a new consultation record.
 * Expects in req.body:
 *  - name: String   (the creator's name)
 *  - roomName: String
 *  - consultationDate: String (formatted as YYYY-MM-DD)
 *  - startTime: String (formatted as HH:mm)
 *  - endTime: String (formatted as HH:mm)
 */

exports.createConsultation = async (req, res) => {
  try {
    const { name, roomName, consultationDate, startTime, endTime } = req.body;
    console.log('Received data:', { name, roomName, consultationDate, startTime, endTime });

    if (!name || !roomName || !consultationDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Parse the date and time strings as local “number” values.
    const [year, month, day] = consultationDate.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // Build Date objects in local time.
    const startDateTime = new Date(year, month - 1, day, startHour, startMinute);
    const endDateTime = new Date(year, month - 1, day, endHour, endMinute);
    console.log('Parsed dates:', { startDateTime, endDateTime });

    // Validate the created Date objects.
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: 'Invalid date or time format.' });
    }
    if (startDateTime >= endDateTime) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }

    // Ensure the consultation does not start in the past.
    const now = new Date();
    if (startDateTime < now) {
      return res.status(400).json({ message: 'Consultation start time cannot be in the past.' });
    }

    // Check that the room name is unique.
    const existingConsultation = await Consultation.findOne({ roomName });
    if (existingConsultation) {
      return res.status(400).json({ message: 'A consultation with this room name already exists.' });
    }

    // Create the consultation record.
    // The "consultationDate" field stores only the date portion.
    const consultation = await Consultation.create({
      createdBy: name,
      consultationDate: new Date(year, month - 1, day),
      startTime: startDateTime,
      endTime: endDateTime,
      roomName,
      status: 'scheduled'
    });

    console.log("Data saved to db successfully")
    return res.status(201).json(consultation);
  } catch (error) {
    console.error('Error in createConsultation:', error);
    return res.status(500).json({ message: error.message });
  }
};

exports.validateConsultation = async (req, res) => {
  try {
    const { roomName } = req.params;
    if (!roomName) {
      return res.status(400).json({ message: 'Room name is required.' });
    }

    const consultation = await Consultation.findOne({ roomName });
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const now = new Date();
    if (now < consultation.startTime) {
      return res.status(400).json({ message: 'Consultation has not started yet.' });
    }
    if (now > consultation.endTime) {
      return res.status(400).json({ message: 'Consultation time has expired.' });
    }

    return res.status(200).json(consultation);
  } catch (error) {
    console.error('Error in validateConsultation:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Retrieve a consultation by the room name.
exports.getConsultationByRoom = async (req, res) => {
  try {
    const { roomName } = req.params;
    const consultation = await Consultation.findOne({ roomName });
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }
    return res.status(200).json(consultation);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Update consultation status (e.g., ongoing, completed, or expired)
// exports.updateConsultationStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;
//     const allowedStatuses = ['scheduled', 'ongoing', 'completed', 'expired'];
    
//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({ message: 'Invalid status value.' });
//     }
    
//     const consultation = await Consultation.findByIdAndUpdate(
//       id, 
//       { status },
//       { new: true }
//     );
//     if (!consultation) {
//       return res.status(404).json({ message: 'Consultation not found.' });
//     }
    
//     // Log the status change event.
//     const event = new ConsultationEvent({
//       consultation: consultation._id,
//       eventType: status === 'completed' ? 'ended' : 'updated',
//       details: { message: `Consultation status updated to: ${status}` }
//     });
//     await event.save();
    
//     return res.status(200).json(consultation);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };



// exports.createVideoSession = async (req, res) => {
//   try {
//     const { consultationId, token } = req.body;
//     const videoSession = new VideoSession({
//       consultation: consultationId,
//       token,
//       startedAt: new Date(),
//       participants: []
//     });
//     const savedSession = await videoSession.save();
//     return res.status(201).json(savedSession);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.addParticipant = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const { user, displayName } = req.body;
//     const videoSession = await VideoSession.findById(sessionId);
//     if (!videoSession) {
//       return res.status(404).json({ message: 'Video session not found.' });
//     }

//     videoSession.participants.push({
//       user,
//       displayName,
//       joinedAt: new Date()
//     });
//     await videoSession.save();
//     return res.status(200).json(videoSession);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.removeParticipant = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const { user } = req.body;
//     const videoSession = await VideoSession.findById(sessionId);
//     if (!videoSession) {
//       return res.status(404).json({ message: 'Video session not found.' });
//     }
    
//     // Mark participant's left time based on user id match.
//     const participant = videoSession.participants.find(
//       (p) => p.user.toString() === user
//     );
//     if (participant) {
//       participant.leftAt = new Date();
//       await videoSession.save();
//     }
    
//     return res.status(200).json(videoSession);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.endVideoSession = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const videoSession = await VideoSession.findById(sessionId);
//     if (!videoSession) {
//       return res.status(404).json({ message: 'Video session not found.' });
//     }
    
//     videoSession.endedAt = new Date();
//     await videoSession.save();
//     return res.status(200).json(videoSession);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.getVideoSession = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const videoSession = await VideoSession.findById(sessionId);
//     if (!videoSession) {
//       return res.status(404).json({ message: 'Video session not found.' });
//     }
//     return res.status(200).json(videoSession);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.createConsultationEvent = async (req, res) => {
//   try {
//     const { consultationId, eventType, details } = req.body;
//     const event = new ConsultationEvent({
//       consultation: consultationId,
//       eventType,
//       details,
//       timestamp: new Date()
//     });
//     const savedEvent = await event.save();
//     return res.status(201).json(savedEvent);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.getEventsByConsultation = async (req, res) => {
//   try {
//     const { consultationId } = req.params;
//     const events = await ConsultationEvent.find({ consultation: consultationId });
//     return res.status(200).json(events);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };