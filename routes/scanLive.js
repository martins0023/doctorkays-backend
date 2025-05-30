// File: routes/scanLive.js
const express = require("express");
const multer = require("multer");
const tesseract = require("node-tesseract-ocr");
const router = express.Router();
const upload = multer();

async function ocrBuffer(buffer) {
  // use tesseract to OCR the buffer directly
  return await tesseract.recognize(buffer, {
    lang: "eng",
    oem: 1,
    psm: 3,
  });
}

/**
 * POST /api/live-scan
 * body: multipart/form-data { frame: image/jpeg }
 * returns { ok: boolean, text: string }
 */
router.post("/api/live-scan", upload.single("frame"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No frame" });
    const text = await ocrBuffer(req.file.buffer);
    // if we have at least 30 chars of text, we consider it “detected”
    const ok = text && text.trim().length >= 30;
    res.json({ ok, text });
  } catch (err) {
    console.error("Live-scan OCR error:", err);
    res.status(500).json({ error: "OCR failed" });
  }
});

module.exports = router;
