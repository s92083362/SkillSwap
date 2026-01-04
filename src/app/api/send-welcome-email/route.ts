import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🎉 Your SkillSwap Registration Was Successful!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5F78;">Welcome${name ? " " + name : ""}!</h2>
          <p style="font-size: 16px; color: #333;">Your account has been registered successfully on <strong>SkillSwap</strong>.</p>
          <p style="font-size: 16px; color: #333;">You can now log in and start:</p>
          <ul style="font-size: 16px; color: #555;">
            <li>Sharing your skills with others</li>
            <li>Learning new skills from the community</li>
            <li>Booking lessons and lessons</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="https://skill-swaps.vercel.app/auth/login-and-signup?tab=login" 
               style="background-color: #2D5F78; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Log In Now
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">SkillSwap Team</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}
