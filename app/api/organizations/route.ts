import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOrganization, listOrganizationsForUser } from "@/lib/organizations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizations = await listOrganizationsForUser(userId);
  return NextResponse.json({ organizations });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; name?: string };
  try {
    body = (await req.json()) as { id?: string; name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id || "").trim();
  const name = (body.name || "").trim();
  if (!id || !name) {
    return NextResponse.json({ error: "Organization id and name are required" }, { status: 400 });
  }

  try {
    await createOrganization({ id, name, ownerId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const organizations = await listOrganizationsForUser(userId);
  return NextResponse.json({ ok: true, organizations });
}

