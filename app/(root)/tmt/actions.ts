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

export async function updateStepStatus(args: UpdateStepArgs) {
  const { userId } = auth();
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

  try {
    const pusher = getPusher();
    const channel = `private-section-${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", {
      stepId,
      status,
      comment,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch {}

  return run;
}

