const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto  = require("crypto");
const nodemailer = require("nodemailer");
const UserPatient = require("../models/UserPatient");
const { signatureHtml } = require("../utils/signature");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_secure_random";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Utility: send a verification email
async function sendVerificationEmail(user) {
  // Generate a one‐time token
  const verificationToken = crypto.randomBytes(20).toString("hex");
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; 
  await user.save();

  // Build verification URL
  const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // Plain text body
  const textBody = [
    `Thanks for signing up, ${user.name}!`,
    `Please verify your email by clicking or pasting this link in your browser:`,
    verifyURL,
    "",
    `If you did not create this account, please ignore this message.`,
    "",
    signatureHtml, // from your utils
  ].join("\n");

  // HTML body
  const htmlBody = `
    <p>Hi ${user.name},</p>
    <p>Thanks for signing up! Please verify your email by clicking the link below:</p>
    <p><a href="${verifyURL}">Verify Your Email</a></p>
    <p>If you did not create this account, please ignore this email.</p>
    ${signatureHtml}
  `;

  await transporter.sendMail({
    to: user.email,
    from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
    subject: "KMC Consultation – Verify Your Email",
    text: textBody,
    html: htmlBody,
  });
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const existing = await UserPatient.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // 1) Hash password & create the new user (emailVerified defaults to false)
    const hash = await bcrypt.hash(password, 12);
    const user = await UserPatient.create({
      name,
      email,
      password: hash,
      emailVerified: false,
    });

    // 2) Generate a short‐lived verification token:

    await user.save();

    // 3) Build a verification URL pointing to our front end:
    await sendVerificationEmail(user);

    // 5) Return a “not verified yet” response:
    return res.status(201).json({
      message: "Account created. Please check your email for verification link."
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }
    const user = await UserPatient.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user with that email." });
    }
    // ● If not yet verified, reject:
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email not verified. Please check your inbox."
      });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({
      message: "Signed in successfully.",
      token,
      user: { name: user.name, email: user.email, id: user._id },
    });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.googleOAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    let user = await UserPatient.findOne({ email });
    if (!user) {
      // New Google signup: create unverified user
      user = new UserPatient({
        name,
        email,
        password: Math.random().toString(36).slice(-8),
        emailVerified: false,
      });
      await user.save();

      // Send verification email
      await sendVerificationEmail(user);

      return res.status(201).json({
        message:
          "Account created via Google. Please check your email for a verification link before signing in.",
      });
    }

    // If existing but not verified, remind them to verify:
    if (!user.emailVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before signing in." });
    }

    // Otherwise (already verified), issue a JWT:
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({
      message: "Signed in with Google",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    return res.status(401).json({ message: "Google token invalid." });
  }
};

// POST /api/auth/forgot
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required." });

  const user = await UserPatient.findOne({ email });
  if (!user) {
    // for security, still respond 200
    return res.json({ message: "If that email is in our system, you’ll receive reset instructions." });
  }

  // 1) generate a one-time token
  const token = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken   = token;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save();

  // 2) Email it
  const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const textBody = [
    `You requested a password reset. Click or paste in your browser:`,
    resetURL,
    `If you didn’t request this, please ignore.`,
    ``,
    signatureHtml
  ].join("\n");

  // 2) Build an HTML body
  const htmlBody = `
    <p>You requested a password reset. Click or paste in your browser:</p>
    <p><a href="${resetURL}">${resetURL}</a></p>
    <p>If you didn’t request this, please ignore.</p>
    ${signatureHtml}  <!-- your HTML signature -->
  `;

  const mail = {
    to:      user.email,
    from:    `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
    subject: "KMC Consultation Password Reset",
    text: textBody,
    html: htmlBody,
  };
  await transporter.sendMail(mail);

  res.json({ message: "Password reset instructions sent if that email exists." });
};

// POST /api/auth/reset
exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields required." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const user = await UserPatient.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Token is invalid or expired." });
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Password has been reset. Please sign in." });
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Missing token." });
    }

    // 1) Look up the user with that token, make sure it hasn’t expired
    const user = await UserPatient.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Token is invalid or expired." });
    }

    // 2) Mark as verified:
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // 3) Inform the front end that verification succeeded
    return res.json({ message: "Email verified. You may now sign in." });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};
