import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Create a reusable transporter object using environment variables for configuration
const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE_PROVIDER,  // Use the email service provider from env
  host: process.env.HOST,                      // SMTP host
  port: process.env.PORT_SLL,                  // SSL port
  secure: true,                                // Use secure connection
  auth: {
    user: process.env.MAILER_EMAIL_ID,         // Sender's email from env
    pass: process.env.MAILER_PASSWORD,         // Sender's email password or app password from env
  },
});

// Define the sendEmail function
export const sendEmail = async (to, firstName, lastName, cin, password) => {
  const mailOptions = {
    from: process.env.MAILER_EMAIL_ID,  // Sender's email from env
    to: to,
    subject: "Welcome to the platform",
    text: `Dear ${firstName} ${lastName},\n\nYour student account has been created.\nYour CIN: ${cin}\nYour password: ${password}\n\nBest regards, The Team.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};
