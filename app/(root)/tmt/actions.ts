"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
import { getPusher } from "@/lib/pusher-server";

type UpdateStepArgs = {
  projectId: string;
  moduleId: string;
  sectionId: string;
  stepId: string;
  status: "untested" | "passed" | "failed" | "blocked";
  comment?: string;
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

  const { projectId, moduleId, sectionId, stepId, status, comment } = args;
  await connectDB();

  const now = new Date();
  const run = await Run.findOneAndUpdate(
    { projectId, moduleId, sectionId },
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
      comment: typeof stepState.comment === "string" ? stepState.comment : comment,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch {}

  return run;
}
