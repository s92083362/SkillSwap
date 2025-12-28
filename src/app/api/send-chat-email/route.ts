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
    
    // Updated testing URL
    const baseUrl = "https://skill-swaps-git-frontend-backend-bawantha-mydeployments.vercel.app";
    const loginUrl = `${baseUrl}/auth/login-and-signup?tab=login&redirect=${encodeURIComponent(chatUrl)}`;

    await transporter.sendMail({
      from: `"SkillSwap Chat" <${process.env.SMTP_USER}>`,
      to,
      subject: "You have a new SkillSwap message",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 20px;
            }
            h2 {
              color: #1F426E;
              margin-bottom: 16px;
            }
            p {
              margin-bottom: 16px;
              color: #555555;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #1F426E;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 16px 0;
            }
            .link-text {
              word-break: break-all;
              color: #1F426E;
              text-decoration: none;
            }
            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #eeeeee;
              font-size: 12px;
              color: #999999;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <h2>New message from ${fromName || "a SkillSwap user"}</h2>
            <p>${previewText}</p>
            <p>Click the button below to view the conversation in SkillSwap. You may be asked to log in first.</p>
            <p>
              <a href="${loginUrl}" class="button">
                View message in SkillSwap
              </a>
            </p>
            <p style="margin-top:16px;">Or copy and paste this link in your browser:<br/>
              <a href="${loginUrl}" class="link-text">${loginUrl}</a>
            </p>
            <div class="footer">
              <p>This email was sent by SkillSwap. If you didn't expect this message, you can safely ignore it.</p>
            </div>
          </div>
        </body>
        </html>
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