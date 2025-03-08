// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGOURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// Define a Mongoose schema for consultation bookings
const consultationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  consultationType: String,
  price: String,
  createdAt: { type: Date, default: Date.now },
});

const Consultation = mongoose.model("Consultation", consultationSchema);

// Endpoint to save consultation details
app.post('/api/consultation', async (req, res) => {
  try {
    const consultationData = req.body;
    const consultation = new Consultation(consultationData);
    await consultation.save();
    res.status(200).json({ message: "Consultation data saved", consultation });
  } catch (err) {
    console.error("Error saving consultation:", err);
    res.status(500).json({ error: "Error saving consultation data" });
  }
});

// Endpoint to send a confirmation email
app.post('/api/sendConfirmationEmail', async (req, res) => {
  try {
    const { email, name, consultationType } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Consultation Booking Confirmation",
      text: `Hi ${name},\n\nYour consultation booking for ${consultationType} has been confirmed.\n\nThank you for choosing Doctor Kay.\n\nBest regards,\nDoctor Kay Team`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Confirmation email sent" });
  } catch (err) {
    console.error("Error sending confirmation email:", err);
    res.status(500).json({ error: "Error sending confirmation email" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
