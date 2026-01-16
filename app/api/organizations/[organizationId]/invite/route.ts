import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createInvitationToken, ensureOrganizationAccess } from "@/lib/organizations";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ organizationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = await context.params;
  if (!organizationId) return NextResponse.json({ error: "Organization id required" }, { status: 400 });

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; projectId?: string; expiresInHours?: number };
  try {
    body = (await req.json()) as { email?: string; projectId?: string; expiresInHours?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const expiresInHours = typeof body.expiresInHours === "number" && body.expiresInHours > 0 ? body.expiresInHours : 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const token = randomUUID();

  await createInvitationToken({
    organizationId,
    invitedBy: userId,
    email: body.email,
    projectId: body.projectId,
    token,
    expiresAt,
  });

  return NextResponse.json({ token, expiresAt });
}
