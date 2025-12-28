import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { to, fromName, previewText, chatId, otherUserId } =
      await request.json();

    if (!to || !previewText || !chatId || !otherUserId) {
      return NextResponse.json(
        { error: "Missing 'to', 'previewText', 'chatId' or 'otherUserId'" },
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

    // The chat page expects /chat?user=USER_ID format
    const chatUrl = `/chat?user=${encodeURIComponent(otherUserId)}`;
    
    // Full login URL with encoded redirect parameter
    const loginUrl = `https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup?tab=login&redirect=${encodeURIComponent(chatUrl)}`;

    await transporter.sendMail({
      from: `"SkillSwap Chat" <${process.env.SMTP_USER}>`,
      to,
      subject: "You have a new SkillSwap message",
      html: `
        <h2>New message from ${fromName || "a SkillSwap user"}</h2>
        <p>${previewText}</p>
        <p>Click the button below to view the conversation in SkillSwap. You may be asked to log in first.</p>
        <p>
          
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
            View message in SkillSwap
          </a>
        </p>
        <p style="margin-top:16px;">Or open this link: <br/>
          <a href="${loginUrl}">${loginUrl}</a>
        </p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-chat-email error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}