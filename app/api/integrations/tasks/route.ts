import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { createClickUpTask, ClickUpTask } from "@/lib/clickup";
import { connectDB } from "@/lib/db";
import { buildDescriptionDoc, createJiraIssue, makeParagraph, JiraDocNode, JiraIssue } from "@/lib/jira";
import {
  ensureOrganizationAccess,
  getOrganizationClickUpConfig,
  getOrganizationJiraConfig,
} from "@/lib/organizations";
import { getPusher } from "@/lib/pusher-server";
import { Project, ProjectDocument } from "@/models/Project";
import { Run } from "@/models/Run";

type IssueProvider = "jira" | "clickup";
type StepStatus = "untested" | "passed" | "failed" | "blocked";

const heading = (text: string): JiraDocNode => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
});

type StoredExternalTask = {
  provider?: IssueProvider;
  key?: string;
  id?: string;
  url?: string;
  createdAt?: string | Date;
  createdBy?: string;
};

type StoredStepRun = {
  status?: StepStatus;
  comment?: string;
  externalTask?: StoredExternalTask;
  jiraIssue?: StoredExternalTask;
  updatedAt?: string | Date;
  updatedBy?: string;
};

type CreateTaskBody = {
  organizationId?: string;
  projectId?: string;
  moduleId?: string;
  sectionId?: string;
  stepId?: string;
  comment?: string;
};

const toLines = (value: unknown): string[] => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.split(/\r?\n/) : [];
};

const buildSummary = (pathLabel: string): string => {
  const summary = `Fix failed step: ${pathLabel}`;
  return summary.length > 254 ? `${summary.slice(0, 251)}...` : summary;
};

const buildJiraDescription = ({
  projectName,
  moduleName,
  sectionName,
  stepTitle,
  stepId,
  stepDescription,
  expectedResults,
  comment,
}: {
  projectName: string;
  moduleName: string;
  sectionName: string;
  stepTitle: string;
  stepId: string;
  stepDescription: string;
  expectedResults?: string;
  comment?: string;
}) => {
  const descriptionNodes: JiraDocNode[] = [
    heading("Context"),
    makeParagraph(projectName, { boldLabel: "Project" }),
    makeParagraph(moduleName, { boldLabel: "Module" }),
    makeParagraph(sectionName, { boldLabel: "Section" }),
    makeParagraph(stepTitle, { boldLabel: "Step" }),
    makeParagraph(stepId, { boldLabel: "Step ID" }),
    heading("Step details"),
    ...toLines(stepDescription).map((line) => makeParagraph(line || undefined)),
  ];

  const expectedLines = toLines(expectedResults);
  if (expectedLines.length) {
    descriptionNodes.push(heading("Expected results"));
    descriptionNodes.push(...expectedLines.map((line) => makeParagraph(line || undefined)));
  }

  const commentLines = toLines(comment);
  if (commentLines.length) {
    descriptionNodes.push(heading("Tester comment"));
    descriptionNodes.push(...commentLines.map((line) => makeParagraph(line || undefined)));
  }

  return buildDescriptionDoc(descriptionNodes);
};

const buildMarkdownDescription = ({
  projectName,
  moduleName,
  sectionName,
  stepTitle,
  stepId,
  stepDescription,
  expectedResults,
  comment,
}: {
  projectName: string;
  moduleName: string;
  sectionName: string;
  stepTitle: string;
  stepId: string;
  stepDescription: string;
  expectedResults?: string;
  comment?: string;
}) => {
  const parts = [
    "### Context",
    `**Project:** ${projectName}`,
    `**Module:** ${moduleName}`,
    `**Section:** ${sectionName}`,
    `**Step:** ${stepTitle}`,
    `**Step ID:** ${stepId}`,
    "",
    "### Step details",
    stepDescription,
  ];

  const expected = typeof expectedResults === "string" ? expectedResults.trim() : "";
  if (expected) {
    parts.push("", "### Expected results", expected);
  }

  const testerComment = typeof comment === "string" ? comment.trim() : "";
  if (testerComment) {
    parts.push("", "### Tester comment", testerComment);
  }

  return parts.join("\n");
};

const normalizeStoredTask = (
  task: StoredExternalTask | undefined,
  fallbackProvider: IssueProvider,
  fallbackDate: Date,
) => {
  if (!task?.key) return undefined;
  return {
    provider: task.provider ?? fallbackProvider,
    key: task.key,
    id: task.id,
    url: task.url,
    createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : fallbackDate.toISOString(),
    createdBy: task.createdBy,
  };
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let body: CreateTaskBody;
  try {
    body = (await req.json()) as CreateTaskBody;
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

  const [jiraConfig, clickupConfig] = await Promise.all([
    getOrganizationJiraConfig(organizationId),
    getOrganizationClickUpConfig(organizationId),
  ]);
  const provider: IssueProvider | null = clickupConfig?.enabled
    ? "clickup"
    : jiraConfig?.enabled
      ? "jira"
      : null;

  if (!provider) {
    return NextResponse.json({ error: "Issue integration is disabled for this organization." }, { status: 400 });
  }

  const projectName = String(project.name ?? "");
  const moduleName = String(projectModule.name ?? "");
  const sectionName = String(section.name ?? "");
  const stepTitle = String(step.title ?? "");
  const stepDescription = String(step.description ?? "");
  const expectedResults = typeof step.expectedResults === "string" ? step.expectedResults : "";
  const pathLabel = [projectName, moduleName, sectionName, stepTitle].filter(Boolean).join(" / ");
  const summary = buildSummary(pathLabel);

  let externalTask: {
    provider: IssueProvider;
    key: string;
    id?: string;
    url?: string;
    createdAt: Date;
    createdBy: string;
  };

  try {
    if (provider === "jira") {
      if (
        !jiraConfig?.baseUrl ||
        !jiraConfig.email ||
        !jiraConfig.apiToken ||
        !jiraConfig.projectKey
      ) {
        return NextResponse.json({ error: "Jira integration is incomplete." }, { status: 400 });
      }

      const issue: JiraIssue = await createJiraIssue({
        config: {
          baseUrl: jiraConfig.baseUrl.replace(/\/+$/, ""),
          email: jiraConfig.email,
          token: jiraConfig.apiToken,
          projectKey: jiraConfig.projectKey,
          issueType: jiraConfig.issueType || "Task",
        },
        summary,
        description: buildJiraDescription({
          projectName,
          moduleName,
          sectionName,
          stepTitle,
          stepId,
          stepDescription,
          expectedResults,
          comment,
        }),
        labels: ["tmt", "automation"],
      });

      externalTask = {
        provider,
        key: issue.key,
        id: issue.id,
        url: issue.url,
        createdAt: new Date(),
        createdBy: userId,
      };
    } else {
      if (!clickupConfig?.listId || !clickupConfig.apiToken) {
        return NextResponse.json({ error: "ClickUp integration is incomplete." }, { status: 400 });
      }

      const task: ClickUpTask = await createClickUpTask({
        config: {
          token: clickupConfig.apiToken,
          listId: clickupConfig.listId,
          status: clickupConfig.status,
        },
        name: summary,
        markdownContent: buildMarkdownDescription({
          projectName,
          moduleName,
          sectionName,
          stepTitle,
          stepId,
          stepDescription,
          expectedResults,
          comment,
        }),
        tags: ["tmt", "automation"],
      });

      externalTask = {
        provider,
        key: task.key,
        id: task.id,
        url: task.url,
        createdAt: new Date(),
        createdBy: userId,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create external task";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const set: Record<string, unknown> = {
    [`steps.${stepId}.externalTask`]: externalTask,
  };
  if (provider === "jira") {
    set[`steps.${stepId}.jiraIssue`] = {
      key: externalTask.key,
      id: externalTask.id,
      url: externalTask.url,
      createdAt: externalTask.createdAt,
      createdBy: externalTask.createdBy,
    };
  }

  const run = await Run.findOneAndUpdate(
    { organizationId, projectId, moduleId, sectionId },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<{ steps?: Record<string, StoredStepRun> } | null>();

  const steps = (run?.steps as Record<string, StoredStepRun>) ?? {};
  const stepRun = steps[stepId] ?? {};
  const payloadExternalTask = stepRun.externalTask ?? externalTask;
  const normalizedExternalTask = normalizeStoredTask(payloadExternalTask, provider, externalTask.createdAt);
  const payloadJiraIssue = stepRun.jiraIssue;
  const normalizedJiraIssue =
    provider === "jira" ? normalizeStoredTask(payloadJiraIssue, "jira", externalTask.createdAt) : undefined;

  const status = stepRun.status ?? "failed";
  const payload = {
    stepId,
    status,
    comment: typeof stepRun.comment === "string" ? stepRun.comment : undefined,
    externalTask: normalizedExternalTask,
    jiraIssue: normalizedJiraIssue,
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
    task: normalizedExternalTask,
    issue: normalizedExternalTask,
    stepRun: {
      status,
      comment: payload.comment,
      externalTask: normalizedExternalTask,
      jiraIssue: normalizedJiraIssue,
    },
  });
}
