// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");
const multer = require("multer"); // Import multer

// const AWS = require('aws-sdk');
// const s3 = new AWS.S3();
// const multerS3 = require('multer-s3');

const jwt = require("jsonwebtoken");
const axios = require("axios");

//models
const Question = require("./models/Question");

// Import routes
const questionsRoutes = require("./routes/questions");
const adminRoutes = require("./routes/admin");
// const consultationRoutes = require('./routes/consultation');
const contactRoutes = require("./routes/contact");
const volunteerRoutes = require("./routes/volunteer");
const sponsorRoutes = require("./routes/sponsor");
const enquiryRoutes = require("./routes/enquirycommerce");
const consultationRoutes = require('./routes/consultationRoutes');
const feedbackRoutes = require('./routes/feedback');

const Consultation = require("./models/Consultation");
const { signatureHtml } = require("./utils/signature");

const app = express();
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, // your api key
  api_secret: process.env.CLOUDINARY_API_SECRET, // your api secret
});

// Use multer with memory storage so we can send the file to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define required file types for which file upload is necessary
const fileRequiredTypes = [
  "Blood Tests",
  "Scan Reports",
  "Blood Tests and Scan Report",
];

// Helper function to upload file to Cloudinary using a stream
// const uploadToCloudinary = (fileBuffer, originalName) => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder: "consultationReports",
//         resource_type: "auto",
//         access_mode: "public",
//         // type: "upload",
//         public_id: originalName, // Preserve original filename
//         overwrite: false, // Prevent duplicate overwrites
//         use_filename: true, // Use original filename
//         unique_filename: false,
//         filename_override: originalName, // Force filename
//         sign_url: true
//     },
//       (error, result) => {
//         if (result) resolve(result);
//         else reject(error);
//       }
//     );
//     stream.end(fileBuffer);
//   });
// };

// Upload file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "consultationReports",
        resource_type: "auto", // Supports images, PDFs, etc.
        access_mode: "public", // Change if you’re using authenticated mode
        public_id: originalName, // Preserve (or use a safe unique version) the original filename
        overwrite: false, // Prevent overwriting duplicates
        use_filename: true,
        unique_filename: false,
        filename_override: originalName,
        sign_url: true, // Generate a signed URL for authenticated assets
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Generate a signed download URL with the attachment flag transformation
const getDownloadUrl = (
  publicId,
  resourceType = "raw",
  customFilename = null
) => {
  // This transformation appends 'fl_attachment' so that the header is set properly.
  // If you want a custom download filename, use: transformation: [{ flags: "attachment:my_custom_filename" }]
  const transformation = customFilename
    ? [{ flags: `attachment:${customFilename}` }]
    : [{ flags: "attachment" }];

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    sign_url: true,
    // transformation: [{ flags: "attachment" }],
    transformation: transformation,
    secure: true,
  });
};

// Multer storage engine for S3
// const upload = multer({
//   storage: multerS3({
//     s3,
//     bucket: process.env.AWS_S3_BUCKET_NAME, // e.g. 'kmc-uploads'
//     acl: "public-read", // files are publicly readable
//     key: (req, file, cb) => {
//       // Use timestamp + original name to avoid collisions
//       const uniqueName = `${Date.now()}_${file.originalname}`;
//       cb(null, uniqueName);
//     },
//   }),
// });

// Use the routes with proper prefixes
app.get('/', (req, res) => res.send('👩‍⚕️ backend is up'));
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/admin", adminRoutes);
// app.use('/api', consultationRoutes);
app.use("/api", contactRoutes);
app.use("/api", volunteerRoutes);
app.use("/api", sponsorRoutes);
app.use("/api/feedback", feedbackRoutes);
// Mount routes under a common API path.
app.use('/api/v1', consultationRoutes);


// 2) Serve React build statically
const buildPath = path.join(__dirname, "client", "build");
app.use(express.static(buildPath));

//TEMPORARY ENDPOINT
//get consultation data
app.get("/api/consultations", async (req, res) => {
  try {
    const consultation = await Consultation.find().sort({ createdAt: -1 });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for consultation details
app.post("/api/consultation", async (req, res) => {
  try {
    const consultationData = req.body;
    const consultation = new Consultation(consultationData);
    await consultation.save();
    res.status(200).json({ message: "Consultation data saved", consultation });
  } catch (err) {
    console.error("Error saving consultation:", err);
    res.status(500).json({ error: "Error saving consultation data" });
  }
});

// DELETE consultation by ID
app.delete("/api/consultations/:id", async (req, res) => {
  try {
    const consultation = await Consultation.findByIdAndDelete(req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: "Consultation not found" });
    }
    res.json({ message: "Consultation deleted successfully", consultation });
  } catch (err) {
    console.error("Error deleting consultation:", err);
    res.status(500).json({ error: "Error deleting consultation" });
  }
});

app.post(
  "/api/free-subscription",
  upload.single("reportFile"),
  async (req, res) => {
    try {
      console.log("Received request for free subscription:", req.body);
      const { name, email, consultationType, story } = req.body;

      let downloadUrl = null;
      let fileUrl = null;
      let fileAttachment = null;

      // Check if the consultation type requires a file and if a file was uploaded
      if (fileRequiredTypes.includes(consultationType) && req.file) {
        console.log("File uploaded, processing upload to Cloudinary.");

        // Upload to Cloudinary (optional if you still want a backup URL)
        const cloudinaryResult = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname
        );
        fileUrl = cloudinaryResult.secure_url;
        console.log("Cloudinary upload successful. File URL:", fileUrl);

        downloadUrl = getDownloadUrl(
          cloudinaryResult.public_id,
          cloudinaryResult.resource_type
        );
        console.log("Generated Download URL:", downloadUrl);

        // Prepare file attachment for email
        fileAttachment = {
          filename: req.file.originalname, // Keep original filename
          content: req.file.buffer, // Attach the file buffer
          contentType: req.file.mimetype, // Maintain original MIME type (e.g., application/pdf)
        };
      }

      // Save free subscription details in the Consultation database
      const freeConsultation = new Consultation({
        name,
        email,
        consultationType,
        story,
        reportFileUrl: fileUrl, // Store Cloudinary URL if available
        downloadUrl: downloadUrl, // New download URL with fl_attachment flag
      });

      await freeConsultation.save();
      console.log("Free consultation record saved successfully.");

      // Set up Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com",
        port: 465,
        secure: true, // SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Email to the registered user
      const mailOptions = {
        from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Free Subscription is Confirmed!",
        text: `Hi ${name},\n\nThank you for subscribing to our ${consultationType} Service.\n\nWe’ve received your subscription and will get back to you within 24hrs.\n\nBest Regards,\nDoctor Kays Team`,
        html: `<p>Hi ${name},</p>
                  <p>Thank you for subscribing to our <strong>${consultationType}</strong> Service.</p>
                  <p>We’ve received your subscription and will get back to you within 24hrs. For Private audio or video consultation, you can subscribe to either our Silver or Gold subscription package.</p>
                  ${signatureHtml}`,
      };

      // Email to Dr. Kay's official email (with file attachment)
      const adminMailOptions = {
        from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO_FORWARD, // Or use process.env.EMAIL_TO_FORWARD
        subject: `New ${consultationType} Registered`,
        text: `A new ${consultationType} has been registered.\n\nName: ${name}\nEmail: ${email}\nStory: ${story}\n`,
        html: `<p>A new <strong>${consultationType}</strong> has been registered.</p>
                      <ul>
                        <li><strong>Name:</strong> ${name}</li>
                        <li><strong>Email:</strong> ${email}</li>
                        <li><strong>Story:</strong> ${story}</li>
                      </ul>
                      ${signatureHtml}`,
        attachments: fileAttachment ? [fileAttachment] : [],
      };

      // Send both emails concurrently
      await Promise.all([
        transporter.sendMail(mailOptions),
        transporter.sendMail(adminMailOptions),
      ]);

      console.log("Emails sent successfully.");
      res
        .status(200)
        .json({
          message: "Free subscription confirmation email sent successfully",
        });
    } catch (err) {
      console.error("Error sending free subscription email:", err);
      res.status(500).json({ error: "Error sending free subscription email" });
    }
  }
);
//get consultation data
// app.get('/api/consultations/test', async (req, res) => {
//   try {
//     const consultation = await Consultation.find().sort({ createdAt: -1 });
//     res.json(consultation);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// 3) Dynamic meta for question pages
app.get("/api/questions/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) throw new Error("Not found");

    // Read the template
    let html = fs.readFileSync(path.join(buildPath, "index.html"), "utf8");

    // Replace placeholders
    const pageUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    html = html
      .replace(/__PAGE_TITLE__/g, question.title)
      .replace(/__PAGE_DESC__/g, question.question)
      .replace(/__PAGE_URL__/g, pageUrl);

    res.send(html);
  } catch (err) {
    console.error(err);
    // Fallback to client‑side app
    res.sendFile(path.join(buildPath, "index.html"));
  }
});

// 4) All other routes → React app
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
