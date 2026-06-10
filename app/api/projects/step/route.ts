import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
// Pusher realtime triggers are disabled for production build stability.
// Uncomment this import and the trigger blocks below to restore structure updates.
// import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess } from "@/lib/organizations";

type UpdateStepPayload = {
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  title?: string;
  description?: string;
  expectedResults?: string;
  organizationId?: string;
};

type DeleteStepPayload = {
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  organizationId?: string;
};

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: UpdateStepPayload;
  try {
    body = (await req.json()) as UpdateStepPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, moduleId, sectionId, stepId, title, description, expectedResults, organizationId } = body || {};
  if (!projectId || !moduleId || !sectionId || !stepId || !title || !description || !organizationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const targetModule = project.modules.find((item: { _id: string }) => item._id === moduleId);
  if (!targetModule) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  const section = targetModule.sections.find((item: { _id: string }) => item._id === sectionId);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  const step = section.steps.find((item: { _id: string }) => item._id === stepId);
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  step.title = title;
  step.description = description;
  if (typeof expectedResults === "string") {
    step.expectedResults = expectedResults;
  }
  await project.save();

  /*
  // Realtime structure update via Pusher. Disabled for production build stability.
  try {
    const pusher = getPusher();
    await pusher.trigger(`presence-tmt-${organizationId}`, "structure-updated", { projectId, organizationId });
  } catch {}
  */

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DeleteStepPayload;
  try {
    body = (await req.json()) as DeleteStepPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, moduleId, sectionId, stepId, organizationId } = body || {};
  if (!projectId || !moduleId || !sectionId || !stepId || !organizationId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const targetModule = project.modules.find((item: { _id: string }) => item._id === moduleId);
  if (!targetModule) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  const section = targetModule.sections.find((item: { _id: string }) => item._id === sectionId);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const before = section.steps.length;
  section.steps = section.steps.filter((item: { _id: string }) => item._id !== stepId);
  if (section.steps.length === before) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await project.save();

  /*
  // Realtime structure update via Pusher. Disabled for production build stability.
  try {
    const pusher = getPusher();
    await pusher.trigger(`presence-tmt-${organizationId}`, "structure-updated", { projectId, organizationId });
  } catch {}
  */

  return NextResponse.json({ ok: true });
}
