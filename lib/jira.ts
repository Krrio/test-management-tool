import { Buffer } from "node:buffer";

type JiraConfig = {
  baseUrl: string;
  email: string;
  token: string;
  projectKey: string;
  issueType: string;
};

export type JiraDocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JiraDocNode[];
  text?: string;
  marks?: Array<{ type: string }>;
};

export type JiraIssue = {
  id: string;
  key: string;
  url: string;
};

type CreateIssueOptions = {
  summary: string;
  description: JiraDescriptionDoc;
  labels?: string[];
  priorityId?: string;
  extraFields?: Record<string, unknown>;
};

export type JiraDescriptionDoc = {
  type: "doc";
  version: number;
  content: JiraDocNode[];
};

const getConfig = (): JiraConfig => {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const issueType = process.env.JIRA_ISSUE_TYPE ?? "Task";

  if (!baseUrl || !email || !token || !projectKey) {
    throw new Error("Missing Jira configuration. Ensure JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN and JIRA_PROJECT_KEY are set.");
  }

  return { baseUrl, email, token, projectKey, issueType };
};

export const makeParagraph = (text?: string, opts?: { boldLabel?: string }): JiraDocNode => {
  if (!text && !opts?.boldLabel) {
    return { type: "paragraph", content: [] };
  }

  const content: JiraDocNode[] = [];
  if (opts?.boldLabel) {
    content.push({
      type: "text",
      text: `${opts.boldLabel}: `,
      marks: [{ type: "strong" }],
    });
  }
  if (text) {
    content.push({ type: "text", text });
  }
  return { type: "paragraph", content };
};

export async function createJiraIssue(options: CreateIssueOptions): Promise<JiraIssue> {
  const { summary, description, labels, priorityId, extraFields } = options;
  const { baseUrl, email, token, projectKey, issueType } = getConfig();

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary,
    issuetype: { name: issueType },
    description,
  };

  if (Array.isArray(labels) && labels.length) {
    fields.labels = labels;
  }
  if (priorityId) {
    fields.priority = { id: priorityId };
  }
  if (extraFields) {
    Object.assign(fields, extraFields);
  }

  const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Jira issue creation failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { id: string; key: string; self?: string };
  return {
    id: data.id,
    key: data.key,
    url: `${baseUrl}/browse/${data.key}`,
  };
}

export const buildDescriptionDoc = (nodes: JiraDocNode[]): JiraDescriptionDoc => ({
  type: "doc",
  version: 1,
  content: nodes,
});
