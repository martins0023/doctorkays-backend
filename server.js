// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend"); 
//const dotenv = require('dotenv');

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

// define mongoose for sponsorship
const sponsorSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  price: String,
  createdAt: { type: Date, default: Date.now },
});

const Sponsor = mongoose.model("Sponsor", sponsorSchema)

// Endpoint to save sponsorship details
app.post('/api/sponsor', async (req, res) => {
    try {
      const sponsorData = req.body;
      const sponsor = new Sponsor(sponsorData);
      await sponsor.save();
      res.status(200).json({ message: "Sponsorship data saved", sponsor });
    } catch (err) {
      console.error("Error saving consultation:", err);
      res.status(500).json({ error: "Error saving consultation data" });
    }
  });

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
// In your server.js (or your backend email route file)
app.post("/api/sendConfirmationEmail", async (req, res) => {
  console.log("Received email confirmation request:", req.body);
  const { email, name, consultationType } = req.body;

  // Validate required fields
  if (!email || !name || !consultationType) {
    console.error("Missing required fields in the request:", req.body);
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify that the API key is available
  if (!process.env.MAILERSEND_API_KEY) {
    console.error("MailerSend API key missing from environment variables!");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // Initialize MailerSend client using your API key
    const mailersend = new MailerSend({
      api_key: process.env.MAILERSEND_API_KEY,  // ensure no extra spaces; if needed, wrap in quotes in your .env file
    });
    console.log("MailerSend client initialized.");

    // Create sender and recipient objects
    const sender = new Sender("doctorkays.kmc.clinic@gmail.com", "Doctor Kay");
    const recipients = [new Recipient(email, name)];

    // Build email parameters
    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject("Consultation Booking Confirmation")
      .setText(
        `Hi ${name},\n\nYour consultation booking for ${consultationType} has been confirmed.\n\nThank you for choosing Doctor Kay.\n\nBest regards,\nDoctor Kay Team`
      );
    
    console.log("Email parameters constructed:", JSON.stringify(emailParams, null, 2));

    // Send the email
    const response = await mailersend.email.send(emailParams);
    console.log("MailerSend response:", response);

    return res.status(200).json({ message: "Confirmation email sent", data: response });
  } catch (error) {
    console.error("Error sending confirmation email:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Error sending confirmation email", details: error.message });
  }
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
