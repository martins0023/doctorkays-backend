const Question = require("../models/Question");

exports.createQuestion = async (req, res) => {
  try {
    const newQuestion = new Question(req.body);
    const savedQuestion = await newQuestion.save();
    res.status(201).json(savedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAnswer = async (req, res) => {
  try {
    const { answer } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    question.answer = answer;
    question.hasDoctorReplied = true;
    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    console.error("Error updating answer:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ date: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Question not found" });

    question.comments.push(req.body);
    const updatedQuestion = await question.save();
    res.status(201).json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateReactions = async (req, res) => {
  try {
    const { type } = req.body; // 'like' or 'dislike'
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Question not found" });

    if (type === "like") question.likes += 1;
    else if (type === "dislike") question.dislikes += 1;

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
