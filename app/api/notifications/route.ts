import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url, "http://localhost");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam) || 20)) : 20;

  const notifications = await listNotifications(userId, limit);
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)).filter(Boolean) : undefined;
  const updated = await markNotificationsRead(userId, ids && ids.length ? ids : undefined);
  const notifications = await listNotifications(userId, 20);
  return NextResponse.json({ updated, notifications });
}
