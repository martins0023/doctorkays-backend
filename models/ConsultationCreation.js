const mongoose = require('mongoose');
const { Schema } = mongoose;

const consultationSchema = new Schema(
  {
    // "createdBy" stores the user who generated the consultation.
    createdBy: { 
      type: String, 
      required: true 
    },
    // Optionally, the other party joining later can be stored here.
    joinedBy: { 
      type: String 
    },
    // The "consultationDate" stores only the date portion.
    consultationDate: { 
      type: Date, 
      required: true 
    },
    // "startTime" and "endTime" are full Date objects (using local time).
    startTime: { 
      type: Date, 
      required: true 
    },
    endTime: { 
      type: Date, 
      required: true 
    },
    roomName: { 
      type: String, 
      required: true, 
      unique: true 
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'expired'],
      default: 'scheduled'
    },
  },
  {
    timestamps: true,
  }
);

// Export with a standard name.
module.exports = mongoose.model('ConsultationCreation', consultationSchema);