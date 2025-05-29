const nodemailer = require("nodemailer");
const { signatureHtml } = require("./signature");

const sendLoginAlert = async (admin, ip, locationData) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = [
    `
Hello ${admin.firstName},

A login attempt was just made to your admin account.

    📍 IP Address: ${ip}

    🌍 Location: ${locationData?.city}, ${locationData?.region}, ${
      locationData?.country
    }
    
    🕒 Time: ${new Date().toLocaleString()}

If this was you, you can ignore this message. Otherwise, please secure your account immediately by contacting the admin.

Regards,
Doctor kays Admin Security Team`,
    ``,
    signatureHtml,
  ].join("\n");

  // 2) Build an HTML body
  const htmlBody = `
    <p>Hello ${admin.firstName},</p>
    <p>A login attempt was just made to your admin account.</p>
    <p> 📍 IP Address: ${ip}</p>

    <p> 🌍 Location: ${locationData?.city}, ${locationData?.region}, ${
    locationData?.country
  }</p>
    
    <p> 🕒 Time: ${new Date().toLocaleString()}</p>
    <p>If this was you, you can ignore this message. Otherwise, please secure your account immediately by contacting the admin.</p>

    <p>Regards,</p>
    <p>Doctor kays Admin Security Team</p>
    ${signatureHtml}  <!-- your HTML signature -->
  `;

  await transporter.sendMail({
    from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
    to: admin.email,
    subject: "New Admin Login Alert",
    text: message,
    html: htmlBody,
  });
};

module.exports = sendLoginAlert;
