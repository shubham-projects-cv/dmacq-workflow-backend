// services/email/src/mailer.ts
import "dotenv/config";
import nodemailer from "nodemailer";

/* ================= TRANSPORT ================= */

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* ================= SEND ================= */

export async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: `"Workflow System" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log("Mail sent to:", to);
}
