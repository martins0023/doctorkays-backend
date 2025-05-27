// File: routes/aiAnalysis.js
const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const router = express.Router();

const MODEL = process.env.MODEL || "gemini-2.5-pro-preview-03-25";
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
    const { fileUrl, userName, userStory, preferredLanguage } = req.body;
    if (!fileUrl || !userName || !userStory || !preferredLanguage) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Determine language code (default to 'en' if invalid)
    const langCode = typeof preferredLanguage === 'string' ? preferredLanguage : 'en';

    // 1) Build the prompt
    const prompt = `
    SYSTEM:
    You are a highly accurate, privacy-first medical AI assistant. You can ingest either:
      • A snapped photo of a medical report  
      • A PDF or text upload of a medical report  
    of any type (lab results, imaging findings, discharge summaries, prescriptions, etc.).  
    
    Your tasks:
    1. Extract and interpret all pertinent data from the report.
    2. Generate a **3-sentence**, **plain-language** summary of the key findings and next-step considerations.
    3. Output the summary in the user’s chosen language (default: English).  
    
    USER:
    {“report_image”: <binary image> OR “report_text”: “<raw text of report>”,
     “language”: "${langCode}"}

     ASSISTANT:
     1. If the input is illegible or missing sections, respond:  
        “I’m sorry, this part of the report couldn’t be interpreted clearly.”  
     2. Otherwise, provide exactly three concise sentences, avoiding medical jargon and speculation.
     
     CONSTRAINTS:
     • Don’t add or remove content beyond what’s in the report.  
     • Never exceed three sentences.  
     • No technical terminology—explain in words any patient can understand.  
     • Do not reference model names or internal processes in your output.
     • Start with an introductory greetings for ${userName}.
     EXAMPLE:
User ${userName} says:
"${userStory}"

Please fetch the report at ${fileUrl} (PDF or image).

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
    // const c = response.candidates?.[0]?.content;
    // console.log("→ content keys:", Object.keys(c));
    // console.log("→ received content:", c);

    // 3) Extract the raw text, handling the SDK’s `content.parts` array
    const c = response.candidates?.[0]?.content;
    let raw = "";

    if (c) {
      if (Array.isArray(c.parts)) {
        // Join all the text parts
        raw = c.parts.map((p) => p.text || "").join("");
      } else if (typeof c === "string") {
        raw = c;
      } else if (typeof c.text === "string") {
        raw = c.text;
      } else if (typeof c.output === "string") {
        raw = c.output;
      }
    }

    console.log("→ final raw text:", raw);

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
