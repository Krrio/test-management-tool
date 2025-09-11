import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPusher } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const socketId = body?.socket_id;
  const channelName = body?.channel_name;
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const pusher = getPusher();

  if (channelName.startsWith("presence-")) {
    const presenceData = { user_id: userId, user_info: { id: userId } } as any;
    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}

