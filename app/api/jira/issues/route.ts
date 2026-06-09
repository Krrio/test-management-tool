import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { connectDB } from "@/lib/db";
import { Project, ProjectDocument } from "@/models/Project";
import { Run } from "@/models/Run";
import { buildDescriptionDoc, createJiraIssue, makeParagraph, JiraDocNode, JiraIssue } from "@/lib/jira";
import { getPusher } from "@/lib/pusher-server";
import { ensureOrganizationAccess, getOrganizationJiraConfig } from "@/lib/organizations";

const heading = (text: string): JiraDocNode => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
});

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type StoredStepRun = {
  status?: StepStatus;
  comment?: string;
  jiraIssue?: {
    key?: string;
    id?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
  externalTask?: {
    provider?: "jira";
    key?: string;
    id?: string;
    url?: string;
    createdAt?: string | Date;
    createdBy?: string;
  };
  updatedAt?: string | Date;
  updatedBy?: string;
};

type CreateIssueBody = {
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  comment?: string;
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let body: CreateIssueBody;
  try {
    body = (await req.json()) as CreateIssueBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { organizationId, projectId, moduleId, sectionId, stepId, comment } = body || {};
  if (!organizationId || !projectId || !moduleId || !sectionId || !stepId) {
    return NextResponse.json({ error: "Missing identifiers" }, { status: 400 });
  }

  await connectDB();

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await Project.findOne({ _id: projectId, organizationId }).lean<ProjectDocument | null>();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const projectModule = project.modules.find((m) => m._id === moduleId);
  if (!projectModule) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }
  const section = projectModule.sections.find((s) => s._id === sectionId);
  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }
  const step = section.steps.find((s) => s._id === stepId);
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const jiraConfig = await getOrganizationJiraConfig(organizationId);
  if (!jiraConfig?.enabled) {
    return NextResponse.json({ error: "Jira integration is disabled for this organization." }, { status: 400 });
  }
  if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken || !jiraConfig.projectKey) {
    return NextResponse.json({ error: "Jira integration is incomplete." }, { status: 400 });
  }

  const pathLabel = [project.name, projectModule.name, section.name, step.title].filter(Boolean).join(" / ");
  let summary = `Fix failed step: ${pathLabel}`;
  if (summary.length > 254) {
    summary = `${summary.slice(0, 251)}...`;
  }

  const descriptionNodes: JiraDocNode[] = [
    heading("Context"),
    makeParagraph(project.name, { boldLabel: "Project" }),
    makeParagraph(projectModule.name, { boldLabel: "Module" }),
    makeParagraph(section.name, { boldLabel: "Section" }),
    makeParagraph(step.title, { boldLabel: "Step" }),
    makeParagraph(step._id, { boldLabel: "Step ID" }),
    heading("Step details"),
    ...step.description.split(/\r?\n/).map((line: string) => makeParagraph(line || undefined)),
  ];

  const expectedResults =
    typeof step.expectedResults === "string" ? step.expectedResults.trim() : "";
  if (expectedResults) {
    descriptionNodes.push(heading("Expected results"));
    descriptionNodes.push(
      ...expectedResults.split(/\r?\n/).map((line: string) => makeParagraph(line || undefined))
    );
  }

  if (comment) {
    descriptionNodes.push(heading("Tester comment"));
    descriptionNodes.push(...String(comment).split(/\r?\n/).map((line) => makeParagraph(line || undefined)));
  }

  let issue: JiraIssue;
  try {
    issue = await createJiraIssue({
      config: {
        baseUrl: jiraConfig.baseUrl.replace(/\/+$/, ""),
        email: jiraConfig.email,
        token: jiraConfig.apiToken,
        projectKey: jiraConfig.projectKey,
        issueType: jiraConfig.issueType || "Task",
      },
      summary,
      description: buildDescriptionDoc(descriptionNodes),
      labels: ["tmt", "automation"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Jira issue";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const now = new Date();
  const jiraIssueDetails = {
    key: issue.key,
    id: issue.id,
    url: issue.url,
    createdAt: now,
    createdBy: userId,
  };
  const externalTaskDetails = {
    provider: "jira" as const,
    ...jiraIssueDetails,
  };

  const run = await Run.findOneAndUpdate(
    { organizationId, projectId, moduleId, sectionId },
    {
      $set: {
        [`steps.${stepId}.jiraIssue`]: jiraIssueDetails,
        [`steps.${stepId}.externalTask`]: externalTaskDetails,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{ steps?: Record<string, StoredStepRun> } | null>();

  const steps = (run?.steps as Record<string, StoredStepRun>) ?? {};
  const stepRun = steps[stepId] ?? {};
  const payloadIssue = stepRun.jiraIssue ?? jiraIssueDetails;
  const payloadExternalTask = stepRun.externalTask ?? externalTaskDetails;
  const normalizedIssue = payloadIssue
    ? {
        ...payloadIssue,
        createdAt: payloadIssue.createdAt ? new Date(payloadIssue.createdAt).toISOString() : now.toISOString(),
      }
    : undefined;
  const normalizedExternalTask = payloadExternalTask
    ? {
        ...payloadExternalTask,
        provider: "jira" as const,
        createdAt: payloadExternalTask.createdAt ? new Date(payloadExternalTask.createdAt).toISOString() : now.toISOString(),
      }
    : undefined;

  const status = stepRun.status ?? "failed";
  const payload = {
    stepId,
    status,
    comment: typeof stepRun.comment === "string" ? stepRun.comment : undefined,
    externalTask: normalizedExternalTask,
    jiraIssue: normalizedIssue,
    updatedAt: stepRun.updatedAt ? new Date(stepRun.updatedAt).toISOString() : undefined,
    updatedBy: stepRun.updatedBy ?? userId,
  };

  try {
    const pusher = getPusher();
    const channel = `private-section-${organizationId}|${projectId}|${moduleId}|${sectionId}`;
    await pusher.trigger(channel, "step-updated", payload);
    await pusher.trigger(`presence-tmt-${organizationId}`, "step-updated", {
      organizationId,
      projectId,
      moduleId,
      sectionId,
      ...payload,
    });
  } catch {}

  return NextResponse.json({
    issue: normalizedIssue,
    task: normalizedExternalTask,
    stepRun: {
      status,
      comment: payload.comment,
      externalTask: normalizedExternalTask,
      jiraIssue: normalizedIssue,
    },
  });
}
