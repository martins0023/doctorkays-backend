const Sponsor = require("../models/Sponsors");

exports.getAllSponsors = async (req, res) => {
  try {
    const sponsors = await Sponsor.find().sort({ createdAt: -1 });
    res.json(sponsors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addSponsor = async (req, res) => {
  try {
    const sponsorData = req.body;
    const sponsor = new Sponsor(sponsorData);
    await sponsor.save();
    res.status(200).json({ message: "Sponsorship data saved", sponsor });
  } catch (err) {
    console.error("Error saving consultation:", err);
    res.status(500).json({ error: "Error saving consultation data" });
  }
};
