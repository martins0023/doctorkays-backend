const crypto = require("crypto");

const Admin = require("../models/Admin");
const Consultation = require("../models/Consultation");
const Contact = require("../models/Contact");
const Question = require("../models/Question");

const sendLoginAlert = require("../utils/sendLoginAlert");
const sendVerificationEmail = require("../utils/sendVerificationEmail");

const nodemailer = require("nodemailer");
const multer = require("multer"); // Import multer
const { default: axios } = require("axios");
const jwt = require("jsonwebtoken");
const { signatureHtml } = require("../utils/signature");

exports.registerAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, contact, address1, password } =
      req.body;
    // Check if the email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin with that email already exists" });
    }

    const admin = new Admin({
      firstName,
      lastName,
      email,
      contact,
      address1,
      password,
    });
    await admin.save();

    // Set up your nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build the notification email options
    const mailOptions = {
      from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Admin Privilege Granted",
      text: `Dear ${firstName} ${lastName},
  
  Your admin account has been created with the email address: ${email}.
  
  Please contact the security team to request your login link and password details.
  
  Best Regards,
  Doctor Kays Team`,
      html: `${signatureHtml}`,
    };

    // Send the notification email
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Admin registered successfully and notification email sent",
    });
  } catch (err) {
    console.error("Error registering admin:", err);
    res.status(500).json({ error: "Error registering admin" });
  }
};

// Map to temporarily store verification tokens (better to use Redis in prod)
const pendingLogins = new Map();
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate verification token (8-character hex token)
    const verificationToken = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();
    const tokenExpiry = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes

    // Store token in memory; in production consider Redis or DB storage
    pendingLogins.set(email, {
      token: verificationToken,
      expires: tokenExpiry,
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    // Return explicit flag so the frontend knows to prompt for verification code
    return res.status(200).json({
      message: "Verification email sent",
      verificationSent: true,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
};

exports.verifyLogin = async (req, res) => {
  try {
    const { email, token } = req.body;
    const record = pendingLogins.get(email);

    if (!record || record.token !== token || Date.now() > record.expires) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    // Token is valid; remove the pending record
    pendingLogins.delete(email);

    // Find the admin and issue a final JWT
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const jwtToken = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Get IP address from request
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    // If multiple IPs are present, take the first one
    if (ip && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    // If the IP is in IPv6 format like "::ffff:192.0.2.128", extract the IPv4 part
    if (ip && ip.includes("::ffff:")) {
      ip = ip.split("::ffff:")[1];
    }

    // Use IP to get location data
    let locationData = {};
    try {
      // Ensure the IP is valid before making the request
      if (ip && ip !== "127.0.0.1") {
        const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);
        locationData = data;
      } else {
        console.warn("Localhost IP detected; skipping geolocation lookup.");
      }
    } catch (err) {
      console.error("Failed to get location data", err.message);
    }

    // Send login alert email
    await sendLoginAlert(admin, ip, locationData);

    return res.status(200).json({
      message: "Verification successful",
      token: jwtToken,
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(500).json({ error: "Server error during verification" });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password"); // omit password
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const contacts = await Contact.countDocuments();
    const consultations = await Consultation.countDocuments();
    const forums = await Question.countDocuments();

    res.json({
      contacts,
      consultations,
      forums,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Unable to fetch stats" });
  }
};

exports.putAdminInfo = async (req, res) => {
  try {
    const { firstName, lastName, email, contact, address1, password } =
      req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    // Update fields if provided
    admin.firstName = firstName || admin.firstName;
    admin.lastName = lastName || admin.lastName;
    admin.email = email || admin.email;
    admin.contact = contact || admin.contact;
    admin.address1 = address1 || admin.address1;
    if (password) {
      admin.password = password; // Note: ensure that your Admin schema has a pre-save hook to hash the password.
    }
    await admin.save();
    res.json({ message: "Profile updated successfully", admin });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ error: "Server error" });
  }
};
