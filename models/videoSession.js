// models/videoSession.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const videoSessionSchema = new Schema(
  {
    consultation: {
      type: Schema.Types.ObjectId,
      ref: 'Consultation',
      required: true,
    },
    token: {
      type: String,
      required: true, // The Twilio access token generated on demand
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        displayName: { type: String },
        joinedAt: { type: Date, default: Date.now },
        leftAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VideoSession', videoSessionSchema);