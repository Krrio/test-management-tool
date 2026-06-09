export type ClickUpConfig = {
  token: string;
  listId: string;
  status?: string;
};

export type ClickUpTask = {
  id: string;
  key: string;
  url: string;
};

type CreateClickUpTaskOptions = {
  config: ClickUpConfig;
  name: string;
  markdownContent: string;
  tags?: string[];
};

export async function createClickUpTask(options: CreateClickUpTaskOptions): Promise<ClickUpTask> {
  const { config, name, markdownContent, tags } = options;
  const body: Record<string, unknown> = {
    name,
    markdown_content: markdownContent,
  };

  if (Array.isArray(tags) && tags.length) {
    body.tags = tags;
  }
  if (config.status?.trim()) {
    body.status = config.status.trim();
  }

  const res = await fetch(
    `https://api.clickup.com/api/v2/list/${encodeURIComponent(config.listId)}/task`,
    {
      method: "POST",
      headers: {
        Authorization: config.token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ClickUp task creation failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    id?: string;
    custom_id?: string | null;
    url?: string;
  };

  if (!data.id) {
    throw new Error("ClickUp task creation failed: missing task id in response");
  }

  return {
    id: data.id,
    key: data.custom_id || data.id,
    url: data.url || `https://app.clickup.com/t/${data.id}`,
  };
}
