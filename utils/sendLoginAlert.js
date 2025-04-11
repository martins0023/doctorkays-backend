const nodemailer = require('nodemailer');
const { signatureHtml } = require('./signature');

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

  const message = `
Hello ${admin.firstName},

A login attempt was just made to your admin account.

    📍 IP Address: ${ip}

    🌍 Location: ${locationData?.city}, ${locationData?.region}, ${locationData?.country}
    
    🕒 Time: ${new Date().toLocaleString()}

If this was you, you can ignore this message. Otherwise, please secure your account immediately by contacting the admin.

Regards,
Doctor kays Admin Security Team`;

  await transporter.sendMail({
    from: `"KMC HOSPITAL LIMITED." <${process.env.EMAIL_USER}>`,
    to: admin.email,
    subject: 'New Admin Login Alert',
    text: message,
    html: `${signatureHtml}`,
  });
};

module.exports = sendLoginAlert;
