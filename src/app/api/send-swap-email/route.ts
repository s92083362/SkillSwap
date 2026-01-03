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

    // 1) Link goes to login page WITH redirect back to swap-requests
    const swapRequestsUrl = encodeURIComponent("/swap-requests");
    const loginUrl = `https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup?tab=login&redirect=${swapRequestsUrl}`;

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family:Poppins, Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">Hi,</h2>
          <p style="margin: 0 0 8px 0;">
            Your swap request for <strong>${lessonTitle}</strong> was
            <strong>${statusText}</strong> by ${ownerName || "the lesson owner"}.
          </p>
          <p style="margin: 0 0 16px 0;">
            Log in to SkillSwap to see more details and manage your swap requests.
          </p>

          <table border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr>
              <td align="center" bgcolor="#4F46E5" style="border-radius: 999px;">
                <a
                  href="${loginUrl}"
                  target="_blank"
                  style="
                    display: inline-block;
                    padding: 10px 22px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 999px;
                    background-color: #1F426E;;
                    font-family: Poppins,Arial, sans-serif;
                  "
                >
                  View in SkillSwap
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #6B7280; margin-top: 12px;">
            If the button does not work, copy and paste this link into your browser:<br />
            <a href="${loginUrl}" styl4F46E5e="color: #2563EB;">${loginUrl}</a>
          </p>
        </div>
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
