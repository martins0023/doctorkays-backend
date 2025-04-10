const Volunteer = require("../models/Volunteer");
const nodemailer = require("nodemailer");

exports.getAllVolunteers = async (req, res) => {
  try {
    const volunteer = await Volunteer.find().sort({ createdAt: -1 });
    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addVolunteers = async (req, res) => {
  console.log("Received POST /api/volunteer with body:", req.body);
  try {
    // 1. Save data to MongoDB
    const volunteerData = req.body;
    const newVolunteer = new Volunteer(volunteerData);
    await newVolunteer.save();
    console.log("Saved volunteer Information:", newVolunteer);

    // 2. Send confirmation email to the user
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true, // SSL
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
    res
      .status(500)
      .json({ error: "Error saving volunteer details or sending email" });
  }
};
