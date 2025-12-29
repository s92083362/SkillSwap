import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { to, type, lessonTitle, otherUserName } = await request.json();
    // type: "created" | "accepted" | "rejected"

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

    let subject = "";
    let mainText = "";

    if (type === "created") {
      subject = "You received a new SkillSwap request";
      mainText = `You have a new swap request for "${lessonTitle}" from ${
        otherUserName || "another user"
      }.`;
    } else if (type === "accepted") {
      subject = "Your SkillSwap request was accepted";
      mainText = `Your swap request for "${lessonTitle}" was accepted by ${
        otherUserName || "the lesson owner"
      }.`;
    } else {
      subject = "Your SkillSwap request was rejected";
      mainText = `Your swap request for "${lessonTitle}" was rejected by ${
        otherUserName || "the lesson owner"
      }.`;
    }

    // Target page after login (production domain)
    const profileUrl =
      "https://skill-swaps-mydeployments.vercel.app/profile";

    // Login URL with redirect back to /profile
    const loginUrl = `https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup?tab=login&redirect=${encodeURIComponent(
      profileUrl
    )}`;

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <h2>Hi,</h2>
        <p>${mainText}</p>
        <p>You can log in to SkillSwap to view the profile and manage your swap.</p>
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
            View Profile
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
    console.error("send-swap-status-email error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}
