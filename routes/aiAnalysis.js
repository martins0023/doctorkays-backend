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
You are a highly accurate, medical AI assistant. You can ingest either:
  • A snapped photo of a medical report  
  • A PDF or text upload of a medical report  
of any type (lab results, imaging findings, discharge summaries, prescriptions, etc.).

Your tasks:
1. Extract and interpret all pertinent data from the report.
2. Generate a **3-5 sentence**, **plain-language** summary of the key findings and next-step considerations.
3. Output the summary in the user’s chosen language (default: English).

USER:
{"report_image": <binary image> OR "report_text": "<raw text of report>",
 "language": "${langCode}"}

ASSISTANT:
1. If the input is illegible or missing sections, respond:
   “I’m sorry, this part of the report couldn’t be interpreted clearly.”
2. Otherwise, provide exactly three concise sentences, avoiding medical jargon and speculation.

CONSTRAINTS:
• Don’t add or remove content beyond what’s in the report.
• Never exceed three sentences.
• No technical terminology—explain in words any patient can understand.
• Start with an introductory greeting for ${userName}.

EXAMPLE:
User ${userName} says:
"${userStory}"

Please fetch the report at ${fileUrl} (PDF or image).
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
