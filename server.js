// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require('path');
const fs = require('fs');
const mongoose = require("mongoose");

//models
const Question = require('./models/Question');

// Import routes
const questionsRoutes = require('./routes/questions');
const adminRoutes = require('./routes/admin');
const consultationRoutes = require('./routes/consultation');
const contactRoutes = require('./routes/contact');
const volunteerRoutes = require('./routes/volunteer');
const sponsorRoutes = require('./routes/sponsor');

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
app.use('/api', sponsorRoutes);

// 2) Serve React build statically
const buildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(buildPath));

// 3) Dynamic meta for question pages
app.get('/api/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) throw new Error('Not found');

    // Read the template
    let html = fs.readFileSync(path.join(buildPath, 'index.html'), 'utf8');

    // Replace placeholders
    const pageUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    html = html
      .replace(/%PAGE_TITLE%/g, question.title)
      .replace(/%PAGE_DESC%/g, question.question)
      .replace(/%PAGE_URL%/g, pageUrl);

    res.send(html);
  } catch (err) {
    console.error(err);
    // Fallback to client‑side app
    res.sendFile(path.join(buildPath, 'index.html'));
  }
});

// 4) All other routes → React app
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
