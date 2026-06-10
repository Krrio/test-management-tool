import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
// Pusher realtime triggers are disabled for production build stability.
// Uncomment this import and the trigger block below to restore structure updates.
// import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess } from "@/lib/organizations";

type DeleteModulePayload = {
  projectId?: string;
  moduleId?: string;
  organizationId?: string;
};

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DeleteModulePayload;
  try {
    body = (await req.json()) as DeleteModulePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, moduleId, organizationId } = body || {};
  if (!projectId || !moduleId || !organizationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const before = project.modules.length;
  project.modules = project.modules.filter((module: { _id: string }) => module._id !== moduleId);
  if (project.modules.length === before) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  await project.save();

  /*
  // Realtime structure update via Pusher. Disabled for production build stability.
  try {
    const p = getPusher();
    await p.trigger(`presence-tmt-${organizationId}`, "structure-updated", { projectId, organizationId });
  } catch {}
  */

  return NextResponse.json({ ok: true });
}
