"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
// Pusher realtime triggers are disabled for production build stability.
// Uncomment this import and the trigger block below to restore realtime updates.
// import { getPusher } from "@/lib/pusher-server";
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

// type StoredStepRun = {
//   comment?: string;
//   externalTask?: {
//     provider?: "jira" | "clickup";
//     key?: string;
//     id?: string;
//     url?: string;
//     createdAt?: string | Date;
//     createdBy?: string;
//   };
//   jiraIssue?: {
//     key?: string;
//     id?: string;
//     url?: string;
//     createdAt?: string | Date;
//     createdBy?: string;
//   };
// };

// const normalizeTask = (
//   value: StoredStepRun["externalTask"] | StoredStepRun["jiraIssue"] | undefined,
//   fallbackProvider?: "jira" | "clickup",
// ) => {
//   if (!value?.key) return undefined;
//   return {
//     ...value,
//     provider: "provider" in value ? value.provider ?? fallbackProvider : fallbackProvider,
//     createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : undefined,
//   };
// };

export async function updateStepStatus(args: UpdateStepArgs) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { organizationId, projectId, moduleId, sectionId, stepId, status, comment } = args;

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  await connectDB();

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
  ).lean();

  /*
  // Realtime section update via Pusher. Disabled for production build stability.
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
      comment: typeof stepState.comment === "string" ? stepState.comment : comment,
      externalTask,
      jiraIssue,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch {}
  */

  return run;
}
