const Feedback = require("../models/Feedback");

exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addFeedback = async (req, res) => {
  try {
    const feedbackData = req.body;
    const feedback = new Feedback(feedbackData);
    await feedback.save();
    res.status(200).json({ message: "Feedback data saved", feedback });
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Error saving feedback data" });
  }
};
