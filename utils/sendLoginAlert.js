const nodemailer = require('nodemailer');

const sendLoginAlert = async (admin, ip, locationData) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
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
Doctor kays Admin Security Team
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: admin.email,
    subject: 'New Admin Login Alert',
    text: message,
  });
};

module.exports = sendLoginAlert;
