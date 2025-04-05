const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Admin Login Verification Code",
    text: `Your verification code is: ${token}\n\nIt will expire in 5 minutes. This means that a request has been made to login to the admin interface with your details, if you haven't initiated this kindly contact the security team.

Best Regards
Doctor kays Admin Security Team.`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendVerificationEmail;
