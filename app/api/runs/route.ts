import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
import { auth } from "@clerk/nextjs/server";
import { getPusher } from "@/lib/pusher-server";

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type StoredStepRun = {
  comment?: string;
  jiraIssue?: {
    key?: string;
    id?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
};

type UpdatePayload = {
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  status?: StepStatus;
  comment?: string;
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const moduleId = searchParams.get("moduleId");
  const sectionId = searchParams.get("sectionId");
  if (!projectId || !moduleId || !sectionId) {
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }
  const run = await Run.findOne({ projectId, moduleId, sectionId }).lean();
  return NextResponse.json({ run: run ?? null });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  await connectDB();
  let body: UpdatePayload;
  try {
    body = (await req.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, moduleId, sectionId, stepId, status, comment } = body || {};
  if (!projectId || !moduleId || !sectionId || !stepId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!["untested", "passed", "failed", "blocked"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date();
  const update = {
    $set: {
      [`steps.${stepId}`]: {
        status,
        comment: typeof comment === "string" ? comment : undefined,
        updatedBy: userId,
        updatedAt: now,
      },
    },
  } as const;

  const run = await Run.findOneAndUpdate(
    { projectId, moduleId, sectionId },
    update,
    { upsert: true, new: true }
  ).lean();

  const steps = (run?.steps as Record<string, StoredStepRun>) ?? {};
  const stepState = steps[stepId] ?? {};
  const jiraIssue = stepState.jiraIssue
    ? {
        ...stepState.jiraIssue,
        createdAt: stepState.jiraIssue.createdAt
          ? new Date(stepState.jiraIssue.createdAt).toISOString()
          : undefined,
      }
    : undefined;

  try {
    const pusher = getPusher();
    const channel = `private-section-${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", {
      stepId,
      status,
      comment: typeof comment === "string" ? comment : stepState.comment,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
    // Also broadcast globally so other sections lists can update without subscribing to each section
    await pusher.trigger("presence-tmt", "step-updated", {
      projectId,
      moduleId,
      sectionId,
      stepId,
      status,
      comment: typeof comment === "string" ? comment : stepState.comment,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch (e) {
    // ignore broadcast errors in skeleton
  }

  return NextResponse.json({ run });
}
