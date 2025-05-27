const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserPatient = require("../models/UserPatient");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_secure_random";

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
    const hash = await bcrypt.hash(password, 12);
    const user = await UserPatient.create({ name, email, password: hash });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { name: user.name, email: user.email, id: user._id },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error." });
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
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      message: "Signed in successfully.",
      token,
      user: { name: user.name, email: user.email, id: user._id },
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
