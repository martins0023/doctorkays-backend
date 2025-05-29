// File: routes/aiAnalysis.js
const express = require("express");
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
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

router.post("/api/ai-analysis", async (req, res) => {
  try {
    const { fileUrl, userName, userStory, preferredLanguage } = req.body;
    if (!fileUrl || !userName || !userStory || !preferredLanguage) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const langCode = typeof preferredLanguage === "string" ? preferredLanguage : "en";

    // If image: legibility check
    if (/\.(jpe?g|png|webp)$/i.test(fileUrl)) {
      const resp = await fetch(fileUrl);
      const buf = await resp.buffer();
      const ocrText = await runOCR(buf);
      if (!ocrText || ocrText.trim().length < 20) {
        return res.status(422).json({
          error: "ImageTooUnclear",
          message: "We couldn’t read your photo clearly. Please retake it in good lighting.",
        });
      }
    }

    // Build a stricter prompt
    const prompt = `
SYSTEM:
You are a highly accurate medical AI assistant. You can ingest a snapped photo or a PDF/text of a medical report.

Your tasks:
1. Extract and interpret all key findings.
2. Generate exactly three concise sentences, in plain language, summarizing what *you* (the patient) need to know, what it means and do next.
3. Use “you” and “your”—never refer to any third person or example like “John Doe.”
4. Emphasize that this is not a medical advice and should seek a proper consultation.

USER:
Report URL: ${fileUrl}
User name: ${userName}
User description: "${userStory}"
Language: ${langCode}

ASSISTANT:
`;

    // Call the model
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    // Pull out the raw text
    const c = response.candidates?.[0]?.content;
    let raw = "";
    if (c) {
      if (Array.isArray(c.parts)) raw = c.parts.map((p) => p.text || "").join("");
      else if (typeof c === "string") raw = c;
      else if (typeof c.text === "string") raw = c.text;
      else if (typeof c.output === "string") raw = c.output;
    }
    if (!raw) throw new Error("AI returned no text");

    // Return
    return res.json({ raw });
  } catch (e) {
    console.error("AI analysis failed:", e);
    if (e.message === "ImageTooUnclear")
      return res.status(422).json({ error: e.message, message: e.message });
    return res.status(500).json({ error: "AI analysis failed", details: e.message });
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
