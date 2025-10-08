import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { consumeInvitationToken } from "@/lib/organizations";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token || "").trim();
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

  try {
    const result = await consumeInvitationToken({ token, userId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

