import "dotenv/config";
import express from "express";
import { sendMail } from "./mailer";

const app = express();
app.use(express.json());

app.post("/send", async (req, res) => {
  console.log("EMAIL REQUEST BODY:", req.body);

  const { to, subject, html } = req.body;

  if (!to) {
    console.error("❌ Missing TO field");
    return res.status(400).json({
      success: false,
      error: "Missing recipient",
    });
  }

  await sendMail(to, subject, html);

  res.json({ success: true });
});

app.listen(5000, () => {
  console.log("Email service on 5000");
});
