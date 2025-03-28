// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend"); 
const Question  = require('./models/Question');
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

//contact connection
const ContactSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  message: String,
  services: [String], // an array of strings
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model("Contact", ContactSchema);

//volunteer connection
const VolunteerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});

const Volunteer = mongoose.model("Volunteer", ContactSchema);

// Create a new question
app.post('/api/questions', async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retrieve all questions
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find().sort({ date: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a comment to a question
app.post('/api/questions/:id/comments', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    question.comments.push(req.body);
    const updatedQuestion = await question.save();
    res.status(201).json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update likes or dislikes
app.patch('/api/questions/:id/reactions', async (req, res) => {
  try {
    const { type } = req.body; // 'like' or 'dislike'
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    if (type === 'like') question.likes += 1;
    else if (type === 'dislike') question.dislikes += 1;

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//volunteer endpoint
app.post("/api/volunteer", async (req, res) => {
  console.log("Received POST /api/volunteer with body:", req.body);
  try {
    // 1. Save data to MongoDB
    const volunteerData = req.body;
    const newVolunteer = new Volunteer(volunteerData);
    await newVolunteer.save();
    console.log("Saved volunteer Information:", newVolunteer);

    // 2. Send confirmation email to the user
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // e.g. your_gmail@gmail.com
        pass: process.env.EMAIL_PASS, // an app password if using 2FA
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: volunteerData.email,
      subject: "Your volunteer request has been received!",
      text: `Dear ${volunteerData.firstName},
  
  We’ve received your message of becoming part of our volunteers. One of our team members will get back to you soon.
  
  Here’s a summary of your request:
  - Name: ${volunteerData.firstName} ${volunteerData.lastName}
  - Phone: ${volunteerData.phone}
  - Message: ${volunteerData.message}
  
  Thank you for reaching out to becoming a volunteer with us!
  
  Best Regards,
  Doctor Kays Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent info:", info);

    res
      .status(200)
      .json({ message: "Volunteer details saved and email sent successfully" });
  } catch (err) {
    console.error("Error saving volunteer details or sending email:", err);
    res.status(500).json({ error: "Error saving volunteer details or sending email" });
  }
});

app.post("/api/free-subscription", async (req, res) => {
  try {
    const { name, email, consultationType } = req.body;

    // Example: Save free subscription data to your database if needed
    // const freeSub = new FreeSubscription({ name, email, consultationType });
    // await freeSub.save();

    // Set up your nodemailer transporter (ensure EMAIL_USER and EMAIL_PASS are set)
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
      subject: "Your Free Subscription is Confirmed!",
      text: `Hi ${name},

Thank you for subscribing to our ${consultationType} Service.

We have received your subscription and will get back to you within 24hrs.

For Private audio or video consultation, you can subscribe to either our Silver or Gold subscription package.

Best Regards,
Doctor Kays Team`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Free subscription confirmation email sent successfully" });
  } catch (err) {
    console.error("Error sending free subscription email:", err);
    res.status(500).json({ error: "Error sending free subscription email" });
  }
});


//contact endpoint
app.post("/api/contact", async (req, res) => {
  console.log("Received POST /api/contact with body:", req.body);
  try {
    // 1. Save data to MongoDB
    const contactData = req.body;
    const newContact = new Contact(contactData);
    await newContact.save();
    console.log("Saved contact:", newContact);

    // 2. Send confirmation email to the user
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // e.g. your_gmail@gmail.com
        pass: process.env.EMAIL_PASS, // an app password if using 2FA
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contactData.email,
      subject: "We’ve received your request!",
      text: `Hi ${contactData.firstName},
  
  We’ve received your message. One of our team members will get back to you soon.
  
  Here’s a summary of your request:
  - Name: ${contactData.firstName} ${contactData.lastName}
  - Phone: ${contactData.phone}
  - Services: ${contactData.services.join(", ")}
  - Message: ${contactData.message}
  
  Thank you for reaching out!
  
  Best Regards,
  Doctor Kays Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent info:", info);

    res
      .status(200)
      .json({ message: "Contact saved and email sent successfully" });
  } catch (err) {
    console.error("Error saving contact or sending email:", err);
    res.status(500).json({ error: "Error saving contact or sending email" });
  }
});

// Endpoint to save sponsorship details
app.post("/api/sponsor", async (req, res) => {
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
