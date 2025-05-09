// File: routes/aiAnalysis.js
const express = require("express");
const axios = require("axios"); // npm install axios
const Consultation = require("../models/Consultation");
const router = express.Router();

const MODEL = process.env.MODEL; // e.g. "gemini-pro@001"
const API_KEY = process.env.GENERATIVE_API_KEY; // set this in your env

router.post("/api/ai-analysis", async (req, res) => {
  try {
    console.log("→ AI-analysis request body:", req.body);
    const { fileUrl, userName, userStory } = req.body;
    if (!fileUrl || !userName || !userStory) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1) Build your prompt text
    const prompt = `
You are a healthcare AI assistant.  User ${userName} says:
"${userStory}"

Please fetch the report at ${fileUrl} (PDF or image).
Produce a structured analysis under these headings:

Overall Purpose and Context:
Structure and Format:
Content Analysis (Section by Section):
Strengths of the Sample Report:
Weaknesses / Areas for Improvement:
Key Takeaways & Implications:
Conclusion:
Next Steps & Recommendations:
`;

    // 2) Call the AI Studio REST API via axios
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta2/models/${MODEL}:generateText?key=${API_KEY}`;
    const aiResponse = await axios.post(
      apiUrl,
      {
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30s timeout
      }
    );

    // 3) Handle non-200
    if (aiResponse.status !== 200) {
      console.error("AI Studio error:", aiResponse.data);
      return res
        .status(502)
        .json({ error: "AI generation failed", details: aiResponse.data });
    }

    console.log("→ AI Studio response:", aiResponse.data);

    // 4) Extract the raw output
    const candidates = aiResponse.data.candidates || [];
    if (!Array.isArray(candidates) || !candidates.length) {
        return res
          .status(502)
          .json({ error: "No candidates returned", raw: aiResponse.data });
      }
    const raw = candidates[0]?.output || "";

    // 5) Split into sections by headings
    const analysis = {};
    const sections = raw.split(/\n(?=[A-Z][^:\n]+:)/g);
    sections.forEach((block) => {
      const [title, ...rest] = block.split(":");
      const key = title.trim();
      const body = rest.join(":").trim();
      if (body) analysis[key] = body;
    });

    // 6) Return structured analysis
    return res.json({ analysis, raw });
  } catch (e) {
    console.error("AI analysis failed:", e);
    return res
      .status(500)
      .json({ error: "AI analysis failed", details: e.message });
  }
});

// → NEW: GET /api/consultation/:id
router.get("/api/consultation/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found" });
    }
    res.json({ consultation });
  } catch (err) {
    console.error("Error fetching consultation:", err);
    res.status(500).json({ error: "Error fetching consultation" });
  }
});

module.exports = router;
