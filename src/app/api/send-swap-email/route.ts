import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { to, type, lessonTitle, ownerName } = await request.json();

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

    const subject =
      type === "accepted"
        ? "Your SkillSwap request was accepted"
        : "Your SkillSwap request was rejected";

    const statusText = type === "accepted" ? "accepted" : "rejected";

    // After login, user should land on the chat/messages page
    const chatMessagesUrl =
      "https://skill-swaps-mydeployments.vercel.app/chat/messages";

    // Login URL with redirect back to /chat/messages
    const loginUrl = `https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup?tab=login&redirect=${encodeURIComponent(
      chatMessagesUrl
    )}`;

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <h2>Hi,</h2>
        <p>Your swap request for <strong>${lessonTitle}</strong> was <strong>${statusText}</strong> by ${
        ownerName || "the lesson owner"
      }.</p>
        <p>You can log in to SkillSwap to see more details about this swap and your messages.</p>
        <p>
          <a
            href="${loginUrl}"
            style="
              display:inline-block;
              padding:10px 20px;
              background-color:#1F426E;
              color:#ffffff;
              text-decoration:none;
              border-radius:6px;
              font-weight:600;
            "
          >
            View in SkillSwap
          </a>
        </p>
        <p style="margin-top:16px;">
          Or open this link:<br/>
          <a href="${loginUrl}">${loginUrl}</a>
        </p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-swap-email error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}
