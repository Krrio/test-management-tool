import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import {
  ensureOrganizationAccess,
  getOrganizationClickUpConfig,
  getOrganizationJiraConfig,
  updateOrganizationClickUpConfig,
  updateOrganizationJiraConfig,
} from "@/lib/organizations";

type IssueProvider = "none" | "jira" | "clickup";

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const isIssueProvider = (value: unknown): value is IssueProvider =>
  value === "none" || value === "jira" || value === "clickup";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const serializeJiraConfig = (config: Awaited<ReturnType<typeof getOrganizationJiraConfig>>) => ({
  enabled: Boolean(config?.enabled),
  baseUrl: config?.baseUrl ?? "",
  email: config?.email ?? "",
  projectKey: config?.projectKey ?? "",
  issueType: config?.issueType ?? "Task",
  hasToken: Boolean(config?.apiToken),
  updatedAt: config?.updatedAt ?? null,
});

const serializeClickUpConfig = (config: Awaited<ReturnType<typeof getOrganizationClickUpConfig>>) => ({
  enabled: Boolean(config?.enabled),
  listId: config?.listId ?? "",
  status: config?.status ?? "",
  hasToken: Boolean(config?.apiToken),
  updatedAt: config?.updatedAt ?? null,
});

const resolveProvider = (
  jira: Awaited<ReturnType<typeof getOrganizationJiraConfig>>,
  clickup: Awaited<ReturnType<typeof getOrganizationClickUpConfig>>,
): IssueProvider => {
  if (clickup?.enabled) return "clickup";
  if (jira?.enabled) return "jira";
  return "none";
};

const serializeIntegrations = (
  jira: Awaited<ReturnType<typeof getOrganizationJiraConfig>>,
  clickup: Awaited<ReturnType<typeof getOrganizationClickUpConfig>>,
) => ({
  provider: resolveProvider(jira, clickup),
  jira: serializeJiraConfig(jira),
  clickup: serializeClickUpConfig(clickup),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = await params;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization id required" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [jira, clickup] = await Promise.all([
    getOrganizationJiraConfig(organizationId),
    getOrganizationClickUpConfig(organizationId),
  ]);

  return NextResponse.json({ integrations: serializeIntegrations(jira, clickup) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = await params;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization id required" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  const role = (membership as { role?: string } | null)?.role;
  if (!membership || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const provider = isIssueProvider(body.provider) ? body.provider : "none";
  const jiraBody = asObject(body.jira);
  const clickupBody = asObject(body.clickup);

  const [existingJira, existingClickUp] = await Promise.all([
    getOrganizationJiraConfig(organizationId),
    getOrganizationClickUpConfig(organizationId),
  ]);

  const jiraBaseUrl =
    typeof jiraBody.baseUrl === "string"
      ? normalizeBaseUrl(jiraBody.baseUrl)
      : existingJira?.baseUrl ?? "";
  const jiraEmail =
    typeof jiraBody.email === "string" ? jiraBody.email.trim() : existingJira?.email ?? "";
  const jiraProjectKey =
    typeof jiraBody.projectKey === "string"
      ? jiraBody.projectKey.trim()
      : existingJira?.projectKey ?? "";
  const jiraIssueType =
    typeof jiraBody.issueType === "string" && jiraBody.issueType.trim()
      ? jiraBody.issueType.trim()
      : existingJira?.issueType ?? "Task";
  const jiraToken =
    typeof jiraBody.apiToken === "string" ? jiraBody.apiToken.trim() : undefined;

  const clickupListId =
    typeof clickupBody.listId === "string"
      ? clickupBody.listId.trim()
      : existingClickUp?.listId ?? "";
  const clickupStatus =
    typeof clickupBody.status === "string" ? clickupBody.status.trim() : existingClickUp?.status ?? "";
  const clickupToken =
    typeof clickupBody.apiToken === "string" ? clickupBody.apiToken.trim() : undefined;

  if (provider === "jira") {
    if (!jiraBaseUrl || !jiraEmail || !jiraProjectKey) {
      return NextResponse.json(
        { error: "Base URL, email and project key are required when enabling Jira." },
        { status: 400 },
      );
    }
    if (!/^https?:\/\//i.test(jiraBaseUrl)) {
      return NextResponse.json({ error: "Jira Base URL must include http(s)://" }, { status: 400 });
    }
    if (!jiraToken && !existingJira?.apiToken) {
      return NextResponse.json(
        { error: "Jira API token is required the first time you enable Jira." },
        { status: 400 },
      );
    }
  }

  if (provider === "clickup") {
    if (!clickupListId) {
      return NextResponse.json(
        { error: "ClickUp List ID is required when enabling ClickUp." },
        { status: 400 },
      );
    }
    if (!clickupToken && !existingClickUp?.apiToken) {
      return NextResponse.json(
        { error: "ClickUp API token is required the first time you enable ClickUp." },
        { status: 400 },
      );
    }
  }

  const [jira, clickup] = await Promise.all([
    updateOrganizationJiraConfig(organizationId, {
      enabled: provider === "jira",
      baseUrl: jiraBaseUrl,
      email: jiraEmail,
      projectKey: jiraProjectKey,
      issueType: jiraIssueType,
      apiToken: jiraToken || undefined,
      updatedBy: userId,
    }),
    updateOrganizationClickUpConfig(organizationId, {
      enabled: provider === "clickup",
      listId: clickupListId,
      status: clickupStatus,
      apiToken: clickupToken || undefined,
      updatedBy: userId,
    }),
  ]);

  return NextResponse.json({ integrations: serializeIntegrations(jira, clickup) });
}
