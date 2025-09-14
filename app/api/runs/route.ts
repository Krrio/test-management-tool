import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Run } from "@/models/Run";
import { auth } from "@clerk/nextjs/server";
import { getPusher } from "@/lib/pusher-server";

export async function GET(req: NextRequest) {
  const { userId } = auth();
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
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  await connectDB();
  let body: any;
  try {
    body = await req.json();
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

  try {
    const pusher = getPusher();
    const channel = `private-section-${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", {
      stepId,
      status,
      comment: typeof comment === "string" ? comment : undefined,
      updatedBy: userId,
      updatedAt: now.toISOString(),
    });
  } catch (e) {
    // ignore broadcast errors in skeleton
  }

  return NextResponse.json({ run });
}
