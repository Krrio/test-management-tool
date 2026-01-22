import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { ensureOrganizationAccess } from "@/lib/organizations";
import { Project } from "@/models/Project";
import { Run } from "@/models/Run";
import { buildXlsx } from "@/lib/xlsx-export";

export const runtime = "nodejs";

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type StoredStepRun = {
  status?: StepStatus;
  comment?: string;
  updatedBy?: string;
  updatedAt?: string | Date;
  jiraIssue?: {
    key?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
};

const toIsoString = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return "";
};

const sanitizeFileName = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  if (!organizationId || !projectId) {
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }

  await connectDB();
  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await Project.findOne({ _id: projectId, organizationId }).lean();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const runs = await Run.find({ organizationId, projectId }).lean();
  const runIndex = new Map<string, Record<string, StoredStepRun>>();
  for (const run of runs) {
    const key = `${run.moduleId}|${run.sectionId}`;
    const steps =
      run.steps instanceof Map
        ? (Object.fromEntries(run.steps.entries()) as Record<string, StoredStepRun>)
        : ((run.steps ?? {}) as Record<string, StoredStepRun>);
    runIndex.set(key, steps);
  }

  const rows: Array<Array<string>> = [
    [
      "projectId",
      "projectName",
      "moduleId",
      "moduleName",
      "sectionId",
      "sectionName",
      "stepId",
      "stepTitle",
      "stepDescription",
      "status",
      "comment",
      "jiraKey",
      "jiraUrl",
      "jiraCreatedAt",
      "jiraCreatedBy",
      "updatedAt",
      "updatedBy",
    ],
  ];

  for (const mod of project.modules ?? []) {
    for (const section of mod.sections ?? []) {
      const runKey = `${mod._id}|${section._id}`;
      const steps = runIndex.get(runKey) ?? {};
      for (const step of section.steps ?? []) {
        const stepRun = steps[step._id] ?? {};
        rows.push([
          String(project._id ?? ""),
          String(project.name ?? ""),
          String(mod._id ?? ""),
          String(mod.name ?? ""),
          String(section._id ?? ""),
          String(section.name ?? ""),
          String(step._id ?? ""),
          String(step.title ?? ""),
          String(step.description ?? ""),
          String(stepRun.status ?? "untested"),
          String(stepRun.comment ?? ""),
          String(stepRun.jiraIssue?.key ?? ""),
          String(stepRun.jiraIssue?.url ?? ""),
          String(toIsoString(stepRun.jiraIssue?.createdAt)),
          String(stepRun.jiraIssue?.createdBy ?? ""),
          String(toIsoString(stepRun.updatedAt)),
          String(stepRun.updatedBy ?? ""),
        ]);
      }
    }
  }

  const buffer = buildXlsx({ name: "Results", rows });
  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = sanitizeFileName(project.name || String(project._id || "results"));
  const fileName = `${baseName || "results"}-${stamp}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
