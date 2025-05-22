// File: routes/aiAnalysis.js
const express = require("express");
const axios = require("axios");
const Tesseract = require("tesseract.js");
const { HfInference } = require("@huggingface/inference");
// const { GoogleGenAI } = require("@google/genai");
const Consultation = require("../models/Consultation");
const router = express.Router();
const sharp = require("sharp");
const pdfjsLib = require("pdfjs-dist/build/pdf.js");

// const MODEL = process.env.MODEL || "gemini-2.5-flash-preview-04-17";
// const API_KEY = process.env.GENERATIVE_API_KEY;
// if (!API_KEY) {
//   console.warn(
//     "⚠️  No GENERATIVE_API_KEY found in env — AI analysis will not work!"
//   );
// }

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const OCR_LANG = "eng"; // or add “+fra” etc.
const SUMMARIZE_MODEL = "google/flan-t5-large";

// const ai = new GoogleGenAI({ apiKey: API_KEY });

router.post("/api/ai-analysis", async (req, res) => {
  try {
    const { fileUrl, userName, userStory, language = "English" } = req.body;
    if (!fileUrl || !userName || !userStory) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1) Download the file (PDF or image)
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // 2) OCR with Tesseract.js (using Sharp + pdfjs for PDFs)
    let ocrText = "";

    if (fileUrl.toLowerCase().endsWith(".pdf")) {
      // load PDF and get number of pages
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;
      const pageCount = pdfDoc.numPages;

      // rasterize each page with Sharp
      for (let i = 0; i < pageCount; i++) {
        const pngBuffer = await sharp(buffer, { density: 300, page: i })
          .png()
          .toBuffer();

        const { data: { text } } = await Tesseract.recognize(pngBuffer, OCR_LANG);
        ocrText += text + "\n\n";
      }
    } else {
      // direct image OCR
      const { data: { text } } = await Tesseract.recognize(buffer, OCR_LANG);
      ocrText = text;
    }

    // 3) Build our refined medical prompt
    const prompt = `
You are a board-certified medical AI assistant.  
User ${userName} says: "${userStory}"

First, analyze the following report text scanned from a PDF/image.  
Answer ONLY in ${language}.

Produce a structured analysis under these headings:
• Findings & Measurements:
• Impression & Diagnosis:
• Recommendations:

Then give a ≤3-sentence summary of the whole report with maximum clinical accuracy.

“””
${ocrText}
“””
`;

    // 4) Call HF Inference API
    const hfResponse = await hf.textGeneration({
      model: SUMMARIZE_MODEL,
      inputs: prompt,
      parameters: { max_new_tokens: 512, temperature: 0.2 },
    });
    const aiOutput = hfResponse.generated_text?.trim();
    if (!aiOutput) throw new Error("No AI output");

    // 5) Split sections by our bullet headings
    const analysis = {};
    aiOutput.split(/\n(?=• )/).forEach((block) => {
      const [headingLine, ...rest] = block.split("\n");
      const heading = headingLine.replace(/^• /, "").replace(/:$/, "").trim();
      analysis[heading] = rest.join("\n").trim();
    });

    // 6) Extract the final ≤3-sentence summary
    const summaryMatch = aiOutput.match(/(?:\n|\r\n)?Summary:(.*)$/i);
    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : Object.values(analysis).slice(-1)[0];

    return res.json({ analysis, summary, ocrText });
  } catch (e) {
    console.error("AI analysis failed:", e);
    return res
      .status(500)
      .json({ error: "AI analysis failed", details: e.message });
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
