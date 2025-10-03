import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPusher } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let socketId: string | null = null;
  let channelName: string | null = null;

  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      socketId = typeof body?.socket_id === "string" ? body.socket_id : null;
      channelName = typeof body?.channel_name === "string" ? body.channel_name : null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    socketId = params.get("socket_id");
    channelName = params.get("channel_name");
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let pusher: ReturnType<typeof getPusher> | null = null;
  try {
    pusher = getPusher();
  } catch {
    return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
  }

  if (channelName.startsWith("presence-")) {
    const presenceData = { user_id: userId, user_info: { id: userId } };
    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
