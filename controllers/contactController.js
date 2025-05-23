const Contact = require("../models/Contact");
const nodemailer = require("nodemailer");
const { signatureHtml } = require("../utils/signature");

exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addContacts = async (req, res) => {
  console.log("Received POST /api/contact with body:", req.body);
  try {
    // 1. Save data to MongoDB
    const contactData = req.body;
    const newContact = new Contact(contactData);
    await newContact.save();
    console.log("Saved contact:", newContact);

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
      from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
      to: contactData.email,
      subject: "We’ve received your request!",
      text: `Hi ${contactData.firstName}, We’ve received your request…`,

      html: `
      <p>Hi ${contactData.firstName},</p>
      <p>We’ve received your message. One of our team members will get back to you soon.</p>
      <h4>Summary:</h4>
      <ul>
        <li><strong>Name:</strong> ${contactData.firstName} ${
        contactData.lastName
      }</li>
        <li><strong>Phone:</strong> ${contactData.phone}</li>
        <li><strong>Services:</strong> ${contactData.services.join(", ")}</li>
        <li><strong>Message:</strong> ${contactData.message}</li>
      </ul>
      ${signatureHtml}
    `,
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
};
