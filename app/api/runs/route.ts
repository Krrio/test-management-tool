import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
import { auth } from "@clerk/nextjs/server";
import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess } from "@/lib/organizations";

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type StoredStepRun = {
  comment?: string;
  externalTask?: {
    provider?: "jira" | "clickup";
    key?: string;
    id?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
  jiraIssue?: {
    key?: string;
    id?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
};

type UpdatePayload = {
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  status?: StepStatus;
  comment?: string;
};

const normalizeTask = (
  value: StoredStepRun["externalTask"] | StoredStepRun["jiraIssue"] | undefined,
  fallbackProvider?: "jira" | "clickup",
) => {
  if (!value?.key) return undefined;
  return {
    ...value,
    provider: "provider" in value ? value.provider ?? fallbackProvider : fallbackProvider,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : undefined,
  };
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");
  const projectId = searchParams.get("projectId");
  const moduleId = searchParams.get("moduleId");
  const sectionId = searchParams.get("sectionId");
  if (!organizationId || !projectId || !moduleId || !sectionId) {
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }
  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const run = await Run.findOne({ organizationId, projectId, moduleId, sectionId }).lean();
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

  const { organizationId, projectId, moduleId, sectionId, stepId, status, comment } = body || {};
  if (!organizationId || !projectId || !moduleId || !sectionId || !stepId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!["untested", "passed", "failed", "blocked"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const set: Record<string, unknown> = {
    [`steps.${stepId}.status`]: status,
    [`steps.${stepId}.updatedBy`]: userId,
    [`steps.${stepId}.updatedAt`]: now,
  };
  if (typeof comment === "string") {
    set[`steps.${stepId}.comment`] = comment;
  }

  const run = await Run.findOneAndUpdate(
    { organizationId, projectId, moduleId, sectionId },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{ steps?: Record<string, StoredStepRun> } | null>();

  const steps = (run?.steps as Record<string, StoredStepRun>) ?? {};
  const stepState = steps[stepId] ?? {};
  const externalTask = normalizeTask(stepState.externalTask);
  const jiraIssue = normalizeTask(stepState.jiraIssue, "jira");

  try {
    const pusher = getPusher();
    const channel = `private-section-${organizationId}|${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", {
      stepId,
      status,
      comment: typeof comment === "string" ? comment : stepState.comment,
      externalTask,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
    // Also broadcast globally so other sections lists can update without subscribing to each section
    await pusher.trigger(`presence-tmt-${organizationId}`, "step-updated", {
      organizationId,
      projectId,
      moduleId,
      sectionId,
      stepId,
      status,
      comment: typeof comment === "string" ? comment : stepState.comment,
      externalTask,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch {
    // ignore broadcast errors in skeleton
  }

  return NextResponse.json({ run });
}
