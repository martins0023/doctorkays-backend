// File: routes/aiAnalysis.js
const express = require("express");
const fetch = require("node-fetch");
const Tesseract = require("tesseract.js");
const pdf = require("pdf-parse");
const axios = require("axios");
const Consultation = require("../models/Consultation");
const router = express.Router();

// ─── Configuration ─────────────────────────────────────────────────────────────
const HF_API_KEY = process.env.HUGGINGFACE_API_TOKEN;
if (!HF_API_KEY) {
  console.warn("⚠️  No HUGGINGFACE_API_KEY found in env — AI analysis will not work!");
}

// Google Flan T5 LARGE model on Hugging Face
const MODEL = "google/flan-t5-large";

// Translation models for a handful of target languages
const TRANSLATION_MODELS = {
  en: null,                     // English — no translation
  es: "Helsinki-NLP/opus-mt-en-es",
  fr: "Helsinki-NLP/opus-mt-en-fr",
  de: "Helsinki-NLP/opus-mt-en-de",
  zh: "Helsinki-NLP/opus-mt-en-zh",
};

// Helper: translate `text` from English into `lang` (ISO code)
async function translate(text, lang) {
  const model = TRANSLATION_MODELS[lang];
  if (!model) return text;

  const resp = await axios.post(
    `https://api-inference.huggingface.co/models/${model}`,
    { inputs: text },
    { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
  );
  return resp.data[0]?.translation_text || text;
}

// ─── POST /api/ai-analysis ─────────────────────────────────────────────────────
router.post("/api/ai-analysis", async (req, res) => {
  try {
    console.log("→ AI-analysis request:", req.body);
    const {
      fileUrl,
      userName,
      userStory,
      preferredLanguage = "en",
    } = req.body;

    if (!fileUrl || !userName || !userStory) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1) Fetch the PDF/image, OCR to extract plain text
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) throw new Error(`Fetch failed: ${fileResp.statusText}`);
    const buffer = Buffer.from(await fileResp.arrayBuffer());
    let extractedText;
    if (fileUrl.toLowerCase().endsWith(".pdf")) {
      const data = await pdf(buffer);
      extractedText = data.text;
    } else {
      const { data } = await Tesseract.recognize(buffer, "eng");
      extractedText = data.text;
    }

    // 2) Build the prompt, including translation instruction at end
    const languageName = ({
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese",
    })[preferredLanguage] || "English";

    const prompt = `
You are a highly accurate healthcare AI assistant.  User ${userName} says:
"${userStory}"

Below is the text extracted from the medical report:
---
${extractedText}
---

1) Provide a structured analysis under these headings:
   Overall Purpose and Context:
   Structure and Format:
   Content Analysis (Section by Section):
   Strengths of the Sample Report:
   Weaknesses / Areas for Improvement:
   Key Takeaways & Implications:
   Conclusion:
   Next Steps & Recommendations:

2) Then give a Concise Summary (max 5 sentences).

3) Finally, translate your entire output into ${languageName}.
`;

    // 3) Send prompt to BioMistral via Hugging Face Inference API
    const hfResp = await axios.post(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      { inputs: prompt, parameters: { max_new_tokens: 1024, temperature: 0.2 } },
      { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
    );
    const raw = hfResp.data[0]?.generated_text?.trim();
    if (!raw) throw new Error("AI returned no content");

    // (No further translation needed; prompt already asked for translation)

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
  } catch (err) {
    console.error("AI analysis failed:", err);
    return res.status(500).json({
      error: "AI analysis failed",
      details: err.message || err,
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
