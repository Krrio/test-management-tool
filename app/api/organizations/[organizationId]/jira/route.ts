import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import {
  ensureOrganizationAccess,
  getOrganizationJiraConfig,
  updateOrganizationJiraConfig,
} from "@/lib/organizations";

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

const serializeConfig = (config: Awaited<ReturnType<typeof getOrganizationJiraConfig>>) => ({
  enabled: Boolean(config?.enabled),
  baseUrl: config?.baseUrl ?? "",
  email: config?.email ?? "",
  projectKey: config?.projectKey ?? "",
  issueType: config?.issueType ?? "Task",
  hasToken: Boolean(config?.apiToken),
  updatedAt: config?.updatedAt ?? null,
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

  const config = await getOrganizationJiraConfig(organizationId);
  return NextResponse.json({ jira: serializeConfig(config) });
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

  let body: {
    enabled?: unknown;
    baseUrl?: unknown;
    email?: unknown;
    projectKey?: unknown;
    issueType?: unknown;
    apiToken?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await getOrganizationJiraConfig(organizationId);

  const enabled =
    typeof body.enabled === "boolean" ? body.enabled : Boolean(existing?.enabled);
  const baseUrlRaw =
    typeof body.baseUrl === "string" ? normalizeBaseUrl(body.baseUrl) : existing?.baseUrl ?? "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : existing?.email ?? "";
  const projectKeyRaw =
    typeof body.projectKey === "string" ? body.projectKey.trim() : existing?.projectKey ?? "";
  const issueTypeRaw =
    typeof body.issueType === "string" && body.issueType.trim()
      ? body.issueType.trim()
      : existing?.issueType ?? "Task";

  const apiTokenProvided =
    typeof body.apiToken === "string" ? body.apiToken.trim() : undefined;

  if (enabled) {
    if (!baseUrlRaw || !emailRaw || !projectKeyRaw) {
      return NextResponse.json(
        { error: "Base URL, email and project key are required when enabling Jira." },
        { status: 400 },
      );
    }
    if (!/^https?:\/\//i.test(baseUrlRaw)) {
      return NextResponse.json({ error: "Base URL must include http(s)://" }, { status: 400 });
    }
    const hasToken = Boolean(apiTokenProvided) || Boolean(existing?.apiToken);
    if (!hasToken) {
      return NextResponse.json(
        { error: "API token is required the first time you enable Jira." },
        { status: 400 },
      );
    }
  }

  const updates: {
    enabled?: boolean;
    baseUrl?: string;
    email?: string;
    projectKey?: string;
    issueType?: string;
    apiToken?: string | null;
    updatedBy?: string;
  } = {
    enabled,
    baseUrl: baseUrlRaw || undefined,
    email: emailRaw || undefined,
    projectKey: projectKeyRaw || undefined,
    issueType: issueTypeRaw || "Task",
    updatedBy: userId,
  };

  if (apiTokenProvided !== undefined) {
    updates.apiToken = apiTokenProvided || null;
  }

  const updated = await updateOrganizationJiraConfig(organizationId, updates);
  return NextResponse.json({ jira: serializeConfig(updated) });
}
