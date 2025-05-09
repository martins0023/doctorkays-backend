// File: routes/aiAnalysis.js
const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const router = express.Router();

const MODEL = process.env.MODEL || "gemini-2.5-flash-preview-04-17";
const API_KEY = process.env.GENERATIVE_API_KEY;
if (!API_KEY) {
  console.warn(
    "⚠️  No GENERATIVE_API_KEY found in env — AI analysis will not work!"
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

router.post("/api/ai-analysis", async (req, res) => {
  try {
    console.log("→ AI-analysis request body:", req.body);
    const { fileUrl, userName, userStory } = req.body;
    if (!fileUrl || !userName || !userStory) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1) Build the prompt
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

    // 2) Call the Gem-ini model via the @google/genai SDK
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      // you can optionally pass these in a `parameters` object if supported:
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    console.log("→ SDK raw response:", response);
    const c = response.candidates?.[0]?.content;
    console.log("→ content keys:", Object.keys(c));
    console.log("→ content value:", c);

    // Extract the actual text property (adjust to your SDK’s shape):
    //   e.g. if c looks like { text: "..." }:
    const raw = c.text ?? c.output ?? (typeof c === "string" ? c : "");

    if (!raw) {
      throw new Error("AI returned no text");
    }

    // 4) Split into named sections
    const analysis = {};
    raw.split(/\n(?=[A-Z][^:\n]+:)/g).forEach((block) => {
      const [title, ...rest] = block.split(":");
      const key = title.trim();
      const body = rest.join(":").trim();
      if (body) analysis[key] = body;
    });

    // 5) Return structured analysis
    return res.json({ analysis, raw });
  } catch (e) {
    console.error("AI analysis failed:", e);
    return res.status(500).json({
      error: "AI analysis failed",
      details: e.message || e,
    });
  }
});

// GET consultation by ID (unchanged)
router.get("/api/consultation/:id", async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
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
