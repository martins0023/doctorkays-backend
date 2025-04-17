const Enquiry = require("../models/EnquiryCommerce");

exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addEnquiry = async (req, res) => {
  try {
    const enquiryData = req.body;
    const enquiry = new Enquiry(enquiryData);
    await enquiry.save();
    res.status(200).json({ message: "Enquiry data saved", sponsor });
  } catch (err) {
    console.error("Error saving enquiry:", err);
    res.status(500).json({ error: "Error saving enquiry data" });
  }
};