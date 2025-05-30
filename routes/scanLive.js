// File: routes/scanLive.js
const express = require("express");
const multer = require("multer");
const tesseract = require("node-tesseract-ocr");
const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const fs = require("fs").promises;
const router = express.Router();
const upload = multer();

const MODEL = process.env.MODEL || "gemini-2.5-pro-preview-03-25";
const ai = new GoogleGenAI({ apiKey: process.env.GENERATIVE_API_KEY });

async function ocrBuffer(buffer) {
  return await tesseract.recognize(buffer, { lang: "eng", oem: 1, psm: 3 });
}

// NEW: one-step live scan + AI analysis
router.post("/live-scan", upload.single("reportFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No reportFile" });

    // 1) quick OCR check (optional)
    const text = await ocrBuffer(req.file.buffer);
    if (!text || text.trim().length < 20) {
      return res.status(422).json({
        error: "ImageTooUnclear",
        message: "Too little text detected; try again in better light.",
      });
    }

    // 2) upload to your storage/DB → create Consultation
    //    you may already have logic in your /api/free-subscription
    const consultation = await Consultation.create({
      name: req.body.name || "LiveScan",
      reportFileBuffer: req.file.buffer,   // or upload to S3, Cloudinary, etc
      story: req.body.mode === "ai" ? "Live capture" : "",
      // ...other fields…
    });

    // 3) build Gemini prompt (same as your ai-analysis.js)
    const prompt = `
SYSTEM:
You are a highly accurate medical AI assistant…
INPUT: this report image
…USER story: Live capture…
Please summarize in three plain-language sentences starting with “Hello…”

`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      temperature: 0.2,
      maxOutputTokens: 512,
    });

    // 4) store raw summary on consultation record
    const raw = response.candidates[0].content.parts
      .map(p => p.text).join("");
    consultation.aiSummary = raw;
    await consultation.save();

    // 5) return the new consultation ID (frontend will call /ai-analysis/:id to fetch full)
    res.json({ consultationId: consultation._id });
  } catch (err) {
    console.error("ai-scan error", err);
    res.status(500).json({ error: "AI scan failed" });
  }
});

module.exports = router;
