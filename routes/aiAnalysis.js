// File: routes/aiAnalysis.js
const express = require("express");
const axios = require('axios');
const fetch = require("node-fetch");
const tesseract = require("node-tesseract-ocr");
const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const fs = require("fs").promises;
const multer = require("multer");
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
  const tmpPath = `/tmp/ocr_${Date.now()}.jpg`;
  await fs.writeFile(tmpPath, buffer);
  try {
    return await tesseract.recognize(tmpPath, {
      lang: "eng",
      oem: 1,
      psm: 3,
    });
  } finally {
    fs.unlink(tmpPath).catch(() => {});
  }
}

router.post(
  "/api/ai-analysis",
  upload.single("reportFile"),
  async (req, res) => {
    try {
      const { userName, userStory, preferredLanguage, fileUrl } = req.body;
      let textSource;
      // 1) If file was uploaded, OCR that
      if (req.file) {
        const buffer = req.file.buffer;
        const ocrText = await runOCR(buffer);
        if (!ocrText || ocrText.trim().length < 20) {
          return res.status(422).json({
            error: "ImageTooUnclear",
            message:
              "We couldn’t read your photo clearly. Please retake it in good lighting.",
          });
        }
        textSource = ocrText;
      }
      // 2) Else if URL passed, fetch + OCR check
      else if (fileUrl) {
        const resp = await fetch(fileUrl);
        const buf = await resp.buffer();
        textSource = await runOCR(buf);
      } else {
        return res
          .status(400)
          .json({ error: "Missing image", message: "No file or URL provided." });
      }

      const langCode =
        typeof preferredLanguage === "string" ? preferredLanguage : "en";

      // 3) Build the same prompt, but feed the OCR text
      const prompt = `
      SYSTEM:
      You are a highly accurate medical AI assistant. You can read extracted text from a snapped photo of a medical report.
      
      Your tasks:
      1. Extract and interpret all key findings.
      2. Generate exactly three concise sentences, in plain language, summarizing what *you* (the patient) need to know next.
      3. Use “you” and “your”—never refer to a third person.
      4. Emphasize that this is not medical advice.
      5. Make greetings to ${userName},

USER:
User name ${userName || "Patient"} says:
"${userStory || ""}"
Here is the report text:
"${textSource.trim()}"
Language: ${langCode}

ASSISTANT:
1. If the input is illegible, respond:
   “I’m sorry, this part of the report couldn’t be interpreted clearly.”
2. Otherwise, provide exactly three concise sentences, no jargon.
`;

      // 4) Generate
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        temperature: 0.2,
        maxOutputTokens: 1024,
      });

      let raw = "";
      const c = response.candidates?.[0]?.content;
      if (c) {
        if (Array.isArray(c.parts)) {
          raw = c.parts.map((p) => p.text || "").join("");
        } else if (typeof c === "string") {
          raw = c;
        } else if (c.text) {
          raw = c.text;
        }
      }

      if (!raw) throw new Error("AI returned no text");

      // 5) Split into sections
      const analysis = {};
      raw.split(/\n(?=[A-Z][^:\n]+:)/g).forEach((block) => {
        const [title, ...rest] = block.split(":");
        const key = title.trim();
        const body = rest.join(":").trim();
        if (body) analysis[key] = body;
      });

      return res.json({ analysis, raw });
    } catch (e) {
      console.error("AI analysis failed:", e);
      if (e.message === "ImageTooUnclear") {
        return res
          .status(422)
          .json({ error: e.message, message: e.message });
      }
      return res.status(500).json({
        error: "AI analysis failed",
        details: e.message || e,
      });
    }
  }
);


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
