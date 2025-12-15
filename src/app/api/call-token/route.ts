// app/api/livekit-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const revalidate = 0; 

export async function POST(req: NextRequest) {
  try {
    const { roomName, userName, userId } = await req.json();

    if (!roomName || !userName || !userId) {
      return NextResponse.json(
        { error: "roomName, userName and userId are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Server misconfigured: Missing LiveKit API Keys" },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: "1h",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json(
      { token },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Error generating LiveKit token:", err);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
