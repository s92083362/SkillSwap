import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("manage email body:", body);

    const { to, type, lessonTitle, ownerName, lessonId } = body;
    // type: "updated" | "deleted"

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
      // logger: true,
      // debug: true,
    });

    let subject = "";
    let statusLine = "";
    let extraText = "";

    if (type === "updated") {
      subject = "Your lesson was updated on SkillSwap";
      statusLine = "was updated successfully.";
      extraText =
        "You can review the latest content from your SkillSwap profile.";
    } else if (type === "deleted") {
      subject = "Your lesson was deleted from SkillSwap";
      statusLine = "was deleted from your lessons.";
      extraText =
        "If this was not intentional, please contact support. This action cannot be undone.";
    } else {
      subject = "Update about your lesson on SkillSwap";
      statusLine = "had a status change.";
      extraText = "You can review details from your SkillSwap profile.";
    }

    // Deployed deep link:
    // - updated: /skills/<lessonId>
    // - deleted or missing id: /profile?section=skills
    const lessonPath =
      type === "updated" && lessonId
        ? `/skills/${lessonId}`
        : "/profile?section=skills";

    const loginUrl =
      "https://skill-swaps-mydeployments.vercel.app/auth/login-and-signup" +
      `?tab=login&redirect=${encodeURIComponent(lessonPath)}`;

    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Hi ${ownerName || ""}</h2>
          <p>Your lesson <strong>${lessonTitle}</strong> ${statusLine}</p>
          <p>${extraText}</p>

          <p style="margin-top: 24px; margin-bottom: 8px;">
            Login and go directly to your lesson:
          </p>

          <a
            href="${loginUrl}"
            style="
              display: inline-block;
              padding: 10px 18px;
              background-color: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
            "
          >
            Login & View Lesson
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
    console.error("send-manage-lesson-email error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: String(err) },
      { status: 500 }
    );
  }
}
