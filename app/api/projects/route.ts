import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { Run } from "@/models/Run";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationAccess } from "@/lib/organizations";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const projects = await Project.find({ organizationId }).lean();
  return NextResponse.json({ projects });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { organizationId?: unknown; projectId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!organizationId || !projectId) {
    return NextResponse.json({ error: "organizationId and projectId are required" }, { status: 400 });
  }

  await connectDB();
  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Project.deleteOne({ _id: projectId, organizationId });
  await Run.deleteMany({ organizationId, projectId });

  return NextResponse.json({ ok: true });
}
