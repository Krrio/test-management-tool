import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess } from "@/lib/organizations";

type CloneModulePayload = {
  projectId?: string;
  sourceModuleId?: string;
  newModuleId?: string;
  newName?: string;
  organizationId?: string;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CloneModulePayload;
  try {
    body = (await req.json()) as CloneModulePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, sourceModuleId, newModuleId, newName, organizationId } = body || {};
  if (!projectId || !sourceModuleId || !newModuleId || !organizationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (project.modules.some((module: { _id: string }) => module._id === newModuleId)) {
    return NextResponse.json({ error: "Target module exists" }, { status: 409 });
  }

  const source = project.modules.find((module: { _id: string }) => module._id === sourceModuleId);
  if (!source) return NextResponse.json({ error: "Source module not found" }, { status: 404 });

  const clone = JSON.parse(JSON.stringify(source)) as typeof source;
  clone._id = newModuleId;
  if (newName && newName.trim()) clone.name = newName.trim();

  project.modules.push(clone);
  await project.save();

  try {
    const p = getPusher();
    await p.trigger(`presence-tmt-${organizationId}`, "structure-updated", { projectId, organizationId });
  } catch {}

  return NextResponse.json({ ok: true });
}
