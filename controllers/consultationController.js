const multer = require("multer"); // Import multer
const nodemailer = require("nodemailer");
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
const cloudinary = require("cloudinary").v2;

const Consultation = require("../models/Sponsors");
const { signatureHtml } = require("../utils/signature");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, // your api key
  api_secret: process.env.CLOUDINARY_API_SECRET, // your api secret
});

// Use multer with memory storage so we can send the file to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define required file types for which file upload is necessary
const fileRequiredTypes = [
  "Blood Tests",
  "Scan Reports",
  "Blood Tests and Scan Report",
];

// Helper function to upload file to Cloudinary using a stream
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "consultationReports",
        resource_type: "raw",
        access_mode: "public",
        type: "upload",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

exports.getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.find().sort({ createdAt: -1 });
    res.json(consultation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addConsultation = async (req, res) => {
  try {
    const consultationData = req.body;
    const consultation = new Consultation(consultationData);
    await consultation.save();
    res.status(200).json({ message: "Consultation data saved", consultation });
  } catch (err) {
    console.error("Error saving consultation:", err);
    res.status(500).json({ error: "Error saving consultation data" });
  }
};

exports.deleteConsultation = async (req, res) => {
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
};

exports.addFreeConsultation = async (req, res) => {
  try {
    console.log("Received request for free subscription:", req.body);
    const { name, email, consultationType, story } = req.body;
    let downloadUrl = null;
    let originalName = null;
    let fileFormat = null;
    let fileAttachment = null;

    // Check if the consultation type requires a file and if a file was uploaded
    if (fileRequiredTypes.includes(consultationType) && req.file) {
      console.log(
        "File uploaded, proceeding to Cloudinary and email attachment."
      );

      // Upload to Cloudinary (optional if you want a backup URL)
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

      const { public_id, format } = cloudinaryResult;
      
      originalName = req.file.originalname;    // e.g. "report.pdf"
      fileFormat   = format;  

      // fileUrl = cloudinaryResult.secure_url;
      // console.log("Cloudinary upload successful. File URL:", fileUrl);

      // Build an attachment URL so browsers download with the correct name
      downloadUrl = cloudinary.url(public_id, {
        resource_type: "raw",
        flags:         "attachment",
        attachment:    encodeURIComponent(originalName),
        format,
      });

      // Prepare file attachment for email
      fileAttachment = {
        filename: originalName, // Keep original filename
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
      reportFileUrl: downloadUrl,
      reportFileName: originalName,
      reportFileExtension: fileFormat && `.${fileFormat}`,
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
      text: `Hi ${name},

Thank you for subscribing to our ${consultationType} Service.

We have received your subscription and will get back to you within 24hrs.

For Private audio or video consultation, you can subscribe to either our Silver or Gold subscription package.

Best Regards,
Doctor Kays Team
${signatureHtml}`,
    };

    // Email to Dr. Kay's official email (with file attachment if available)
    const adminMailOptions = {
      from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO_FORWARD, // Or use process.env.EMAIL_TO_FORWARD
      subject: `New ${consultationType} Registered`,
      text: `A new ${consultationType} has been registered.

Name: ${name}
Email: ${email}
Consultation Type: ${consultationType}
History: ${story}

Please follow up accordingly.
${signatureHtml}`,
      attachments: fileAttachment ? [fileAttachment] : [],
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(adminMailOptions),
    ]);

    console.log("Emails sent successfully.");
    res.status(200).json({
      message: "Free subscription confirmation email sent successfully",
      fileUrl: downloadUrl,  // return the download link if you want
    });
  } catch (err) {
    console.error("Error sending free subscription email:", err);
    res.status(500).json({ error: "Error sending free subscription email" });
  }
};

exports.consultationConfirmationEmail = async (req, res) => {
  console.log("Received email confirmation request:", req.body);
  const { email, name, consultationType } = req.body;

  // Validate required fields
  if (!email || !name || !consultationType) {
    console.error("Missing required fields in the request:", req.body);
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify that the API key is available
  if (!process.env.MAILERSEND_API_KEY) {
    console.error("MailerSend API key missing from environment variables!");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // Initialize MailerSend client using your API key
    const mailersend = new MailerSend({
      api_key: process.env.MAILERSEND_API_KEY, // ensure no extra spaces; if needed, wrap in quotes in your .env file
    });
    console.log("MailerSend client initialized.");

    // Create sender and recipient objects
    const sender = new Sender("doctorkays.kmc.clinic@gmail.com", "Doctor Kay");
    const recipients = [new Recipient(email, name)];

    // Build email parameters
    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject("Consultation Booking Confirmation")
      .setText(
        `Hi ${name},\n\nYour consultation booking for ${consultationType} has been confirmed.\n\nThank you for choosing Doctor Kay.\n\nBest regards,\nDoctor Kay Team`
      );

    console.log(
      "Email parameters constructed:",
      JSON.stringify(emailParams, null, 2)
    );

    // Send the email
    const response = await mailersend.email.send(emailParams);
    console.log("MailerSend response:", response);

    return res
      .status(200)
      .json({ message: "Confirmation email sent", data: response });
  } catch (error) {
    console.error("Error sending confirmation email:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Error sending confirmation email",
      details: error.message,
    });
  }
};
