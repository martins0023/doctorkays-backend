// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Import routes
const questionsRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');
const consultationRoutes = require('./routes/consultation');
const contactRoutes = require('./routes/contact');
const volunteerRoutes = require('./routes/volunteer');

const app = express();
app.use(cors());
app.use(express.json());


// Connect to MongoDB
mongoose
  .connect(process.env.MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Use the routes with proper prefixes
app.use('/api/questions', questionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', consultationRoutes);
app.use('/api', contactRoutes);
app.use('/api', volunteerRoutes);


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
