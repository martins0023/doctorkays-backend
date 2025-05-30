// File: routes/aiAnalysis.js
const express = require("express");
const axios = require('axios');
const fetch = require("node-fetch");
const tesseract = require("node-tesseract-ocr");
const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const fs = require("fs").promises;
const router = express.Router();

const MODEL = process.env.MODEL || "gemini-2.5-pro-preview-03-25";
const API_KEY = process.env.GENERATIVE_API_KEY;
if (!API_KEY) {
  console.warn(
    "⚠️  No GENERATIVE_API_KEY found in env — AI analysis will not work!"
  );
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// helper: run OCR on a Buffer via Tesseract.js
async function runOCR(buffer) {
  const tmp = `/tmp/ocr_${Date.now()}.jpg`;
  await fs.writeFile(tmp, buffer);

  try {
    return await tesseract.recognize(tmp, {
      lang: "eng",
      oem: 1,
      psm: 3,
    });
  } catch (err) {
    // CLI not installed → code 127
    if (err.code === 127 || /not found/.test(err.message)) {
      const e = new Error("OCRNotInstalled");
      e.code = 127;
      throw e;
    }
    // any other OCR error
    throw err;
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

router.post("/api/ai-analysis", async (req, res) => {
  try {
    console.log("→ AI-analysis request body:", req.body);
    const { fileUrl, userName, userStory, preferredLanguage } = req.body;
    if (!fileUrl || !userName || !userStory || !preferredLanguage) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const langCode =
      typeof preferredLanguage === "string" ? preferredLanguage : "en";

    // 0) If this is an image URL (jpg/png/webp), fetch & OCR‐check via Tesseract.js
    if (/\.(jpe?g|png|webp)$/i.test(fileUrl)) {
      const resp = await fetch(fileUrl);
      const buf = await resp.buffer();
      let ocrText;
      try {
        ocrText = await runOCR(buf);
      } catch (ocrErr) {
        if (ocrErr.message === "OCRNotInstalled") {
          return res
            .status(500)
            .json({ error: "OCRNotInstalled", message: "Server OCR engine not available." });
        }
        console.warn("OCR failure, skipping legibility check:", ocrErr);
        ocrText = "";
      }
      if (ocrText && ocrText.trim().length < 20) {
        return res.status(422).json({
          error: "ImageTooUnclear",
          message: "We couldn’t read your photo clearly. Please retake it in good lighting.",
        });
      }
    }

    // 1) Build the prompt (unchanged)
    const prompt = `
    SYSTEM:
    You are a highly accurate medical AI assistant. You can ingest a snapped photo or a PDF/text of a medical report.
    
    Your tasks:
    1. Extract and interpret all key findings.
    2. Generate exactly three concise sentences, in plain language, summarizing what *you* (the patient) need to know, what it means and do next.
    3. Use “you” and “your”—never refer to any third person or example like “John Doe.”
    4. Emphasize that this is not a medical advice and should seek a proper consultation.
    5. Start with an introductory greeting for ${userName}.
    
    USER:User name ${userName} says:
    "${userStory}"
    Please fetch the report at ${fileUrl} (PDF or image).
    Language: ${langCode}

ASSISTANT:
1. If the input is illegible or missing sections, respond:
   “I’m sorry, this part of the report couldn’t be interpreted clearly.”
2. Otherwise, provide exactly three concise sentences, avoiding medical jargon and speculation.

CONSTRAINTS:
• Don’t add or remove content beyond what’s in the report.
• Never exceed three sentences.
• No technical terminology—explain in words any patient can understand.
`;

    // 2) Call the GenAI model
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    // 3) Extract the raw text (unchanged)
    const c = response.candidates?.[0]?.content;
    let raw = "";
    if (c) {
      if (Array.isArray(c.parts)) {
        raw = c.parts.map((p) => p.text || "").join("");
      } else if (typeof c === "string") {
        raw = c;
      } else if (typeof c.text === "string") {
        raw = c.text;
      } else if (typeof c.output === "string") {
        raw = c.output;
      }
    }
    if (!raw) throw new Error("AI returned no text");

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
    if (e.message === "ImageTooUnclear") {
      return res.status(422).json({ error: e.message, message: e.message });
    }
    if (e.message === "OCRNotInstalled") {
      return res
        .status(500)
        .json({ error: e.message, message: "OCR engine not installed on server." });
    }
    return res.status(500).json({
      error: "AI analysis failed",
      details: e.message || e,
    });
  }
});


//language translate
router.post("/api/translate", async (req, res) => {
  const { text, target } = req.body;
  if (!text || !target) {
    return res.status(400).json({ error: "Missing text or target language" });
  }
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) throw new Error("No translate API key configured");
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const { data } = await axios.post(url, {
      q: text,
      target,
      format: "text",
    });
    const translated = data.data.translations[0].translatedText;
    res.json({ translated });
  } catch (err) {
    console.error("Translate failed:", err);
    res.status(500).json({ error: "Translation failed", details: err.message });
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
