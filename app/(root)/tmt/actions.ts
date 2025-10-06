"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess } from "@/lib/organizations";

type UpdateStepArgs = {
  projectId: string;
  moduleId: string;
  sectionId: string;
  stepId: string;
  status: "untested" | "passed" | "failed" | "blocked";
  comment?: string;
  organizationId: string;
};

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

export async function updateStepStatus(args: UpdateStepArgs) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { organizationId, projectId, moduleId, sectionId, stepId, status, comment } = args;

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  await connectDB();

  const now = new Date();
  const run = await Run.findOneAndUpdate(
    { organizationId, projectId, moduleId, sectionId },
    {
      $set: {
        [`steps.${stepId}`]: {
          status,
          comment: typeof comment === "string" ? comment : undefined,
          updatedBy: userId,
          updatedAt: now,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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
    const channel = `private-section-${organizationId}|${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", {
      stepId,
      status,
      comment: typeof stepState.comment === "string" ? stepState.comment : comment,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch {}

  return run;
}
