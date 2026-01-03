// app/api/send-lesson-status-email/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { to, type, lessonTitle, ownerName } = await request.json();
    // type: "created" | "failed"

    if (!to || !type) {
      return NextResponse.json(
        { error: "Missing to or type" },
        { status: 400 }
      );
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

    const isCreated = type === "created";
    const subject = isCreated
      ? "Your lesson was published on SkillSwap"
      : "Your lesson publish attempt failed";

    const statusText = isCreated ? "published successfully" : "not published";
    const extraText = isCreated
      ? "You can now manage this lesson from your SkillSwap profile."
      : "Please try again or contact support if the problem continues.";

    // 🔗 Login-aware URL: user logs in first, then is redirected to skills section
    const loginUrl =
      "https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup" +
  "?tab=login&redirect=/profile?section=skills";

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Hi ${ownerName || ""}</h2>
          <p>Your lesson <strong>${lessonTitle}</strong> was <strong>${statusText}</strong>.</p>
          <p>${extraText}</p>

          <p style="margin-top: 24px; margin-bottom: 8px;">
            Login and go directly to your lessons:
          </p>

          <a
            href="${loginUrl}"
            style="
              display: inline-block;
              padding: 10px 18px;
              background-color: #1F426E;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
            "
          >
            Login & View Your Lessons
          </a>

          <p style="margin-top: 16px; font-size: 12px; color: #6b7280;">
            Or open this link:<br/>
            <a href="${loginUrl}" style="color:#2563eb;">${loginUrl}</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-lesson-status-email error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}
