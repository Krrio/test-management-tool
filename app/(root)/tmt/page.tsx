"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { NotificationsBell } from "@/components/notifications-bell";
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Copy,
  Trash,
  ExternalLink,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { toast } from "@/components/ui/sonner";

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type TestStep = {
  id: string;
  title: string;
  description: string;
  expectedResults: string;
};

type StepIssue = {
  provider?: "jira" | "clickup";
  key: string;
  url?: string;
  id?: string;
  createdAt?: string;
  createdBy?: string;
};

type StepRun = {
  status: StepStatus;
  comment?: string;
  externalTask?: StepIssue;
  jiraIssue?: StepIssue;
};

type RawStepRun = {
  status?: StepStatus;
  comment?: unknown;
  externalTask?: (Partial<StepIssue> & { createdAt?: unknown }) | null;
  jiraIssue?: (Partial<StepIssue> & { createdAt?: unknown }) | null;
};

type CreateExternalTaskResponse = {
  stepRun?: {
    status?: StepStatus;
    comment?: string;
    externalTask?: StepIssue;
    jiraIssue?: StepIssue;
  };
  issue?: StepIssue;
  task?: StepIssue;
  error?: string;
};

type Section = {
  id: string;
  name: string;
  steps: TestStep[];
};

type Module = {
  id: string;
  name: string;
  sections: Section[];
};

type Project = {
  id: string;
  name: string;
  modules: Module[];
};

type Organization = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

type OrganizationJiraConfig = {
  enabled: boolean;
  baseUrl: string;
  email: string;
  projectKey: string;
  issueType: string;
  hasToken: boolean;
  updatedAt: string | null;
};

type OrganizationClickUpConfig = {
  enabled: boolean;
  listId: string;
  status: string;
  hasToken: boolean;
  updatedAt: string | null;
};

type IssueProvider = "none" | "jira" | "clickup";

type OrganizationIntegrationsConfig = {
  provider: IssueProvider;
  jira: OrganizationJiraConfig;
  clickup: OrganizationClickUpConfig;
};

type ApiProject = {
  _id: string;
  name: string;
  modules?: Array<{
    _id: string;
    name: string;
    sections?: Array<{
      _id: string;
      name: string;
      steps?: Array<{
        _id: string;
        title: string;
        description: string;
        expectedResults?: string;
      }>;
    }>;
  }>;
};

type PusherChannel = {
  bind: (event: string, callback: (...args: unknown[]) => void) => void;
  unsubscribe: () => void;
  members?: { count?: number };
};

const mapApiProjects = (items: ApiProject[]): Project[] =>
  items.map((p) => ({
    id: p._id,
    name: p.name,
    modules: (p.modules ?? []).map((m) => ({
      id: m._id,
      name: m.name,
      sections: (m.sections ?? []).map((s) => ({
        id: s._id,
        name: s.name,
        steps: (s.steps ?? []).map((st) => ({
          id: st._id,
          title: st.title,
          description: st.description,
          expectedResults:
            typeof st.expectedResults === "string" ? st.expectedResults : "",
        })),
      })),
    })),
  }));

const normalizeJiraConfig = (value: unknown): OrganizationJiraConfig | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const issueTypeRaw =
    typeof raw.issueType === "string" && raw.issueType.trim() ?
      raw.issueType
    : "Task";
  return {
    enabled: Boolean(raw.enabled),
    baseUrl: typeof raw.baseUrl === "string" ? raw.baseUrl : "",
    email: typeof raw.email === "string" ? raw.email : "",
    projectKey: typeof raw.projectKey === "string" ? raw.projectKey : "",
    issueType: issueTypeRaw,
    hasToken: Boolean(raw.hasToken),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
};

const normalizeClickUpConfig = (
  value: unknown,
): OrganizationClickUpConfig | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    enabled: Boolean(raw.enabled),
    listId: typeof raw.listId === "string" ? raw.listId : "",
    status: typeof raw.status === "string" ? raw.status : "",
    hasToken: Boolean(raw.hasToken),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
};

const emptyJiraConfig: OrganizationJiraConfig = {
  enabled: false,
  baseUrl: "",
  email: "",
  projectKey: "",
  issueType: "Task",
  hasToken: false,
  updatedAt: null,
};

const emptyClickUpConfig: OrganizationClickUpConfig = {
  enabled: false,
  listId: "",
  status: "",
  hasToken: false,
  updatedAt: null,
};

const normalizeIntegrationsConfig = (
  value: unknown,
): OrganizationIntegrationsConfig | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const provider =
    (
      raw.provider === "jira" ||
      raw.provider === "clickup" ||
      raw.provider === "none"
    ) ?
      raw.provider
    : "none";
  return {
    provider,
    jira: normalizeJiraConfig(raw.jira) ?? emptyJiraConfig,
    clickup: normalizeClickUpConfig(raw.clickup) ?? emptyClickUpConfig,
  };
};

const isStepStatus = (value: unknown): value is StepStatus =>
  value === "untested" ||
  value === "passed" ||
  value === "failed" ||
  value === "blocked";

const normalizeStepIssue = (
  value: unknown,
  fallbackProvider?: "jira" | "clickup",
): StepIssue | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  if (!key) return undefined;

  const issue: StepIssue = { key };
  if (raw.provider === "jira" || raw.provider === "clickup") {
    issue.provider = raw.provider;
  } else if (fallbackProvider) {
    issue.provider = fallbackProvider;
  }
  if (typeof raw.url === "string") issue.url = raw.url;
  if (typeof raw.id === "string") issue.id = raw.id;
  if (typeof raw.createdBy === "string") issue.createdBy = raw.createdBy;

  const createdAtValue = raw.createdAt;
  if (typeof createdAtValue === "string") {
    issue.createdAt = createdAtValue;
  } else if (
    createdAtValue &&
    typeof createdAtValue === "object" &&
    "toISOString" in createdAtValue &&
    typeof (createdAtValue as { toISOString?: unknown }).toISOString ===
      "function"
  ) {
    issue.createdAt = (createdAtValue as Date).toISOString();
  }

  return issue;
};

type StepUpdatedPayload = {
  stepId: string;
  status: StepStatus;
  comment?: string;
  externalTask?: StepIssue;
  jiraIssue?: StepIssue;
};

type StepBroadcastPayload = StepUpdatedPayload & {
  organizationId: string;
  projectId: string;
  moduleId: string;
  sectionId: string;
};

type StructureUpdatedPayload = {
  organizationId: string;
  projectId: string;
};

const parseStepUpdatedPayload = (input: unknown): StepUpdatedPayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const stepId = typeof raw.stepId === "string" ? raw.stepId : "";
  const status = isStepStatus(raw.status) ? raw.status : undefined;
  if (!stepId || !status) return null;

  const payload: StepUpdatedPayload = {
    stepId,
    status,
    comment: typeof raw.comment === "string" ? raw.comment : undefined,
    externalTask: normalizeStepIssue(raw.externalTask),
    jiraIssue: normalizeStepIssue(raw.jiraIssue, "jira"),
  };

  return payload;
};

const parseStepBroadcastPayload = (
  input: unknown,
): StepBroadcastPayload | null => {
  if (!input || typeof input !== "object") return null;
  const base = parseStepUpdatedPayload(input);
  if (!base) return null;
  const raw = input as Record<string, unknown>;
  const organizationId =
    typeof raw.organizationId === "string" ? raw.organizationId : "";
  const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
  const moduleId = typeof raw.moduleId === "string" ? raw.moduleId : "";
  const sectionId = typeof raw.sectionId === "string" ? raw.sectionId : "";
  if (!organizationId || !projectId || !moduleId || !sectionId) return null;
  return { ...base, organizationId, projectId, moduleId, sectionId };
};

const parseStructureUpdatedPayload = (
  input: unknown,
): StructureUpdatedPayload | null => {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const organizationId =
    typeof raw.organizationId === "string" ? raw.organizationId : "";
  const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
  if (!organizationId || !projectId) return null;
  return { organizationId, projectId };
};

// Data now fetched from API

type SectionRunKey = `${string}|${string}|${string}|${string}`; // organizationId|projectId|moduleId|sectionId

export default function TestCaseLabPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === organizationId),
    [organizations, organizationId],
  );
  const canManageOrganization = useMemo(
    () =>
      activeOrganization?.role === "owner" ||
      activeOrganization?.role === "admin",
    [activeOrganization],
  );

  const [organizationFormOpen, setOrganizationFormOpen] = useState(false);
  const [organizationFormId, setOrganizationFormId] = useState("");
  const [organizationFormName, setOrganizationFormName] = useState("");
  const [organizationFormError, setOrganizationFormError] = useState("");
  const [organizationFormSubmitting, setOrganizationFormSubmitting] =
    useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  // runs: map from sectionKey -> map of stepId -> { status, comment? }
  const [runs, setRuns] = useState<
    Record<SectionRunKey, Record<string, StepRun>>
  >({});
  const [sectionCompleteOpen, setSectionCompleteOpen] = useState(false);
  const [sectionCompleteName, setSectionCompleteName] = useState<
    string | undefined
  >(undefined);
  const [stepSort, setStepSort] = useState<"asc" | "desc">("asc");
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editExpectedResults, setEditExpectedResults] = useState<string>("");
  const [editingCommentStepId, setEditingCommentStepId] = useState<
    string | null
  >(null);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "project"; id: string; name: string }
    | { type: "module"; id: string; name: string }
    | { type: "section"; id: string; name: string }
    | { type: "step"; id: string; name: string }
    | null
  >(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupBase, setDupBase] = useState<Module | null>(null);
  const [dupName, setDupName] = useState("");
  const [search, setSearch] = useState("");
  const [creatingIssueFor, setCreatingIssueFor] = useState<string | null>(null);
  const [integrationErrors, setIntegrationErrors] = useState<
    Record<string, string>
  >({});
  const [inviteLoading, setInviteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [integrationsConfig, setIntegrationsConfig] =
    useState<OrganizationIntegrationsConfig | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsDialogOpen, setIntegrationsDialogOpen] = useState(false);
  const [integrationsDialogError, setIntegrationsDialogError] = useState("");
  const [integrationsSaving, setIntegrationsSaving] = useState(false);
  const [integrationsForm, setIntegrationsForm] = useState<{
    provider: IssueProvider;
    jira: {
      baseUrl: string;
      email: string;
      projectKey: string;
      issueType: string;
      apiToken: string;
    };
    clickup: {
      listId: string;
      status: string;
      apiToken: string;
    };
  }>({
    provider: "none",
    jira: {
      baseUrl: "",
      email: "",
      projectKey: "",
      issueType: "Task",
      apiToken: "",
    },
    clickup: {
      listId: "",
      status: "",
      apiToken: "",
    },
  });
  const isDarkMode = theme === "dark";

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const loadOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      const list = (data?.organizations ?? []) as Organization[];
      setOrganizations(list);
      setOrganizationId((prev) => {
        if (prev && list.some((org) => org.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } catch {
      setOrganizations([]);
      setOrganizationId("");
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );
  const activeModule = useMemo(
    () => project?.modules.find((m) => m.id === moduleId),
    [project, moduleId],
  );
  const activeSection = useMemo(
    () => activeModule?.sections.find((s) => s.id === sectionId),
    [activeModule, sectionId],
  );

  const getSectionKey = (
    oId: string,
    pId: string,
    mId: string,
    sId: string,
  ): SectionRunKey => `${oId}|${pId}|${mId}|${sId}`;

  const sectionKey = useMemo<SectionRunKey | undefined>(() => {
    if (!organizationId || !project || !activeModule || !activeSection)
      return undefined;
    return getSectionKey(
      organizationId,
      project.id,
      activeModule.id,
      activeSection.id,
    );
  }, [organizationId, project, activeModule, activeSection]);

  const getStepStatus = useCallback(
    (sKey: SectionRunKey | undefined, stepId: string): StepStatus => {
      if (!sKey) return "untested";
      const value = runs[sKey]?.[stepId];
      return value?.status ?? "untested";
    },
    [runs],
  );

  const getStepComment = useCallback(
    (sKey: SectionRunKey | undefined, stepId: string): string => {
      if (!sKey) return "";
      return runs[sKey]?.[stepId]?.comment ?? "";
    },
    [runs],
  );

  const getStepIssue = useCallback(
    (
      sKey: SectionRunKey | undefined,
      stepId: string,
    ): StepIssue | undefined => {
      if (!sKey) return undefined;
      return (
        runs[sKey]?.[stepId]?.externalTask ?? runs[sKey]?.[stepId]?.jiraIssue
      );
    },
    [runs],
  );

  const setStepStatus = async (
    sKey: SectionRunKey | undefined,
    stepId: string,
    status: StepStatus,
    comment?: string,
  ) => {
    if (!sKey || !project || !activeModule || !activeSection || !organizationId)
      return;
    setIntegrationErrors((prev) => {
      if (!prev[stepId]) return prev;
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
    // optimistic update
    setRuns((prev) => ({
      ...prev,
      [sKey]: {
        ...prev[sKey],
        [stepId]: {
          ...(prev[sKey]?.[stepId] ?? { status: "untested" }),
          status,
          comment:
            typeof comment === "string" ? comment : (
              prev[sKey]?.[stepId]?.comment
            ),
        },
      },
    }));
    // persist
    try {
      await fetch(`/api/runs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId: project.id,
          moduleId: activeModule.id,
          sectionId: activeSection.id,
          stepId,
          status,
          comment,
        }),
      });
    } catch {
      // ignore errors in optimistic skeleton, could rollback here
    }
  };

  const createExternalTask = async (step: TestStep) => {
    if (
      !organizationId ||
      !project ||
      !activeModule ||
      !activeSection ||
      !sectionKey
    )
      return;
    if (!integrationEnabled) {
      setIntegrationErrors((prev) => ({
        ...prev,
        [step.id]: "Issue integration is disabled for this organization.",
      }));
      return;
    }
    const key = getSectionKey(
      organizationId,
      project.id,
      activeModule.id,
      activeSection.id,
    );
    setCreatingIssueFor(step.id);
    setIntegrationErrors((prev) => {
      const next = { ...prev };
      delete next[step.id];
      return next;
    });
    try {
      const res = await fetch("/api/integrations/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId: project.id,
          moduleId: activeModule.id,
          sectionId: activeSection.id,
          stepId: step.id,
          comment: getStepComment(sectionKey, step.id) || undefined,
        }),
      });
      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {}
      const data = (payload ?? null) as CreateExternalTaskResponse | null;
      if (!res.ok) {
        const message =
          data?.error ? String(data.error) : "Failed to create external task";
        setIntegrationErrors((prev) => ({ ...prev, [step.id]: message }));
        return;
      }
      setRuns((prev) => {
        const prevSection = prev[key] ?? {};
        const prevStep = prevSection[step.id];
        const nextStatus =
          data?.stepRun?.status ?? prevStep?.status ?? "failed";
        const normalizedTask = normalizeStepIssue(
          data?.stepRun?.externalTask ?? data?.task ?? data?.issue,
        );
        const normalizedJiraIssue = normalizeStepIssue(
          data?.stepRun?.jiraIssue,
          "jira",
        );
        return {
          ...prev,
          [key]: {
            ...prevSection,
            [step.id]: {
              ...(prevStep ?? { status: nextStatus }),
              status: nextStatus,
              comment:
                typeof data?.stepRun?.comment === "string" ?
                  data.stepRun.comment
                : prevStep?.comment,
              externalTask: normalizedTask ?? prevStep?.externalTask,
              jiraIssue: normalizedJiraIssue ?? prevStep?.jiraIssue,
            },
          },
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ?
          error.message
        : "Failed to create external task";
      setIntegrationErrors((prev) => ({ ...prev, [step.id]: message }));
    } finally {
      setCreatingIssueFor(null);
    }
  };

  const computeSectionStatus = (sec: Section): StepStatus => {
    if (!project || !activeModule || !organizationId) return "untested";
    const key = getSectionKey(
      organizationId,
      project.id,
      activeModule.id,
      sec.id,
    );
    const statuses = sec.steps.map(
      (st) => runs[key]?.[st.id]?.status ?? "untested",
    );
    if (statuses.length && statuses.every((s) => s === "passed"))
      return "passed";
    if (statuses.some((s) => s === "failed")) return "failed";
    if (statuses.some((s) => s === "blocked")) return "blocked";
    if (statuses.some((s) => s === "passed")) return "untested"; // show as untested if partially done
    return "untested";
  };

  const statusBadge = (status: StepStatus | "in_progress") => {
    const map: Record<
      string,
      {
        text: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        className?: string;
      }
    > = {
      passed: { text: "PASSED", variant: "default" },
      failed: { text: "FAILED", variant: "destructive" },
      blocked: { text: "BLOCKED", variant: "secondary" },
      in_progress: { text: "IN PROGRESS", variant: "outline" },
      untested: { text: "UNTESTED", variant: "outline" },
    };
    const s = map[status];
    return <Badge variant={s.variant}>{s.text}</Badge>;
  };

  const handleSelectProject = (id: string) => {
    const p = projects.find((x) => x.id === id);
    setProjectId(id);
    const firstModule = p?.modules[0];
    setModuleId(firstModule?.id ?? "");
    const firstSection = firstModule?.sections[0];
    setSectionId(firstSection?.id ?? "");
  };

  const handleSelectModule = (id: string) => {
    setModuleId(id);
    const m = project?.modules.find((x) => x.id === id);
    const firstSection = m?.sections[0];
    setSectionId(firstSection?.id ?? "");
  };

  // Module progress breakdown by status so the top bar can reflect multiple states
  const moduleProgress = useMemo(() => {
    const mod = activeModule;
    if (!project || !mod || !organizationId) {
      return {
        total: 0,
        counts: { passed: 0, failed: 0, blocked: 0, untested: 0 },
        percentages: { passed: 0, failed: 0, blocked: 0, untested: 0 },
      };
    }

    let total = 0;
    const counts: Record<StepStatus | "untested", number> = {
      passed: 0,
      failed: 0,
      blocked: 0,
      untested: 0,
    };

    for (const sec of mod.sections) {
      const key = getSectionKey(organizationId, project.id, mod.id, sec.id);
      for (const st of sec.steps) {
        total += 1;
        const status = getStepStatus(key, st.id);
        if (status in counts) {
          counts[status] += 1;
        } else {
          counts.untested += 1;
        }
      }
    }

    const percentages = Object.fromEntries(
      (Object.keys(counts) as Array<keyof typeof counts>).map((status) => [
        status,
        total === 0 ? 0 : Number(((counts[status] / total) * 100).toFixed(2)),
      ]),
    ) as { passed: number; failed: number; blocked: number; untested: number };

    return { total, counts, percentages };
  }, [project, activeModule, organizationId, getStepStatus]);

  const progressSegments = useMemo(() => {
    const config = [
      { key: "passed", label: "Passed", className: "bg-primary" },
      { key: "failed", label: "Failed", className: "bg-destructive" },
      { key: "blocked", label: "Blocked", className: "bg-amber-500" },
      { key: "untested", label: "Untested", className: "bg-muted" },
    ] as const;

    return config.map((entry) => ({
      ...entry,
      count: moduleProgress.counts[entry.key],
      pct: moduleProgress.percentages[entry.key],
    }));
  }, [moduleProgress]);

  const activeProgressSegments = useMemo(
    () => progressSegments.filter((segment) => segment.pct > 0),
    [progressSegments],
  );

  const sortedSteps = (sec: Section) => {
    const arr = [...sec.steps];
    if (stepSort === "desc") arr.reverse();
    return arr;
  };

  const q = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredModules = useMemo(() => {
    if (!project) return [] as Module[];
    if (!q) return project.modules;
    return project.modules.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true;
      for (const s of m.sections) {
        if (s.name.toLowerCase().includes(q)) return true;
        for (const st of s.steps) {
          if (
            st.title.toLowerCase().includes(q) ||
            st.description.toLowerCase().includes(q) ||
            st.expectedResults.toLowerCase().includes(q)
          )
            return true;
        }
      }
      return false;
    });
  }, [project, q]);

  const filteredSections = useMemo(() => {
    if (!activeModule) return [] as Section[];
    if (!q) return activeModule.sections;
    return activeModule.sections.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      for (const st of s.steps) {
        if (
          st.title.toLowerCase().includes(q) ||
          st.description.toLowerCase().includes(q) ||
          st.expectedResults.toLowerCase().includes(q)
        )
          return true;
      }
      return false;
    });
  }, [activeModule, q]);

  // Refresh projects preserving current selection when possible
  const refreshProjectsPreserve = useCallback(async () => {
    if (!organizationId) {
      setProjects([]);
      setProjectId("");
      setModuleId("");
      setSectionId("");
      setRuns({});
      return;
    }
    try {
      const params = new URLSearchParams({ organizationId });
      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      const raw =
        Array.isArray(data?.projects) ? (data.projects as ApiProject[]) : [];
      const list = mapApiProjects(raw);
      setProjects(list);
      setRuns((prev) => {
        const scopedPrefix = `${organizationId}|`;
        const scopedEntries = Object.entries(prev).filter(([key]) =>
          key.startsWith(scopedPrefix),
        );
        return Object.fromEntries(scopedEntries);
      });
      if (!list.length) {
        setProjectId("");
        setModuleId("");
        setSectionId("");
        return;
      }
      const pSel = list.find((p) => p.id === projectId) ?? list[0];
      const mSel =
        pSel.modules.find((m) => m.id === moduleId) ?? pSel.modules[0];
      const sSel =
        mSel?.sections.find((s) => s.id === sectionId) ?? mSel?.sections[0];
      setProjectId(pSel?.id ?? "");
      setModuleId(mSel?.id ?? "");
      setSectionId(sSel?.id ?? "");
    } catch {}
  }, [organizationId, projectId, moduleId, sectionId]);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64);

  const openDuplicateModule = (mod: Module) => {
    setDupBase(mod);
    setDupName(`${mod.name} Copy`);
    setDupOpen(true);
  };

  const duplicateModule = async () => {
    if (!organizationId || !project || !dupBase) return;
    const newName = dupName.trim();
    const newId = slugify(newName);
    if (!newId) return;
    // optimistic update
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== project.id) return p;
        const src = p.modules.find((m) => m.id === dupBase.id);
        if (!src) return p;
        const copy: Module = {
          id: newId,
          name: newName,
          sections: src.sections.map((s) => ({
            id: s.id,
            name: s.name,
            steps: s.steps.map((st) => ({ ...st })),
          })),
        };
        return { ...p, modules: [...p.modules, copy] };
      }),
    );
    try {
      await fetch("/api/projects/module/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId: project.id,
          sourceModuleId: dupBase.id,
          newModuleId: newId,
          newName,
        }),
      });
    } finally {
      setDupOpen(false);
      setDupBase(null);
      setDupName("");
      refreshProjectsPreserve();
    }
  };

  const integrationProvider = integrationsConfig?.provider ?? "none";
  const integrationEnabled = integrationProvider !== "none";
  const integrationProviderLabel =
    integrationProvider === "clickup" ? "ClickUp"
    : integrationProvider === "jira" ? "Jira"
    : "Issue integration";
  const integrationBadgeClassName = useMemo(
    () =>
      [
        integrationEnabled ? "" : "border-destructive/60 text-destructive",
        integrationsLoading ? "opacity-80" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [integrationEnabled, integrationsLoading],
  );
  const integrationUpdatedAtLabel = useMemo(() => {
    const updatedAt =
      integrationProvider === "jira" ? integrationsConfig?.jira.updatedAt
      : integrationProvider === "clickup" ?
        integrationsConfig?.clickup.updatedAt
      : null;
    if (!updatedAt) return "";
    const date = new Date(updatedAt);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  }, [
    integrationProvider,
    integrationsConfig?.jira.updatedAt,
    integrationsConfig?.clickup.updatedAt,
  ]);

  const seedIntegrationsForm = (
    config?: OrganizationIntegrationsConfig | null,
    opts?: { forceProvider?: Exclude<IssueProvider, "none"> },
  ) => {
    const source = typeof config === "undefined" ? integrationsConfig : config;
    setIntegrationsForm({
      provider: opts?.forceProvider ?? source?.provider ?? "none",
      jira: {
        baseUrl: source?.jira.baseUrl ?? "",
        email: source?.jira.email ?? "",
        projectKey: source?.jira.projectKey ?? "",
        issueType: source?.jira.issueType ?? "Task",
        apiToken: "",
      },
      clickup: {
        listId: source?.clickup.listId ?? "",
        status: source?.clickup.status ?? "",
        apiToken: "",
      },
    });
  };

  const openIntegrationsDialog = (opts?: {
    forceProvider?: Exclude<IssueProvider, "none">;
  }) => {
    if (!canManageOrganization) return;
    seedIntegrationsForm(undefined, opts);
    setIntegrationsDialogError("");
    setIntegrationsDialogOpen(true);
  };

  const closeIntegrationsDialog = (
    config?: OrganizationIntegrationsConfig | null,
  ) => {
    seedIntegrationsForm(config);
    setIntegrationsDialogError("");
    setIntegrationsDialogOpen(false);
  };

  const handleSaveIntegrationsConfig = async () => {
    if (!organizationId || !canManageOrganization) return;
    setIntegrationsDialogError("");
    setIntegrationsSaving(true);
    const previousProvider = integrationProvider;
    const payload = {
      provider: integrationsForm.provider,
      jira: {
        baseUrl: integrationsForm.jira.baseUrl.trim(),
        email: integrationsForm.jira.email.trim(),
        projectKey: integrationsForm.jira.projectKey.trim(),
        issueType: integrationsForm.jira.issueType.trim() || "Task",
        apiToken: integrationsForm.jira.apiToken.trim(),
      },
      clickup: {
        listId: integrationsForm.clickup.listId.trim(),
        status: integrationsForm.clickup.status.trim(),
        apiToken: integrationsForm.clickup.apiToken.trim(),
      },
    };
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/integrations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      let responseBody: unknown = null;
      try {
        responseBody = await res.json();
      } catch {}
      if (!res.ok) {
        const message =
          (
            typeof (responseBody as { error?: unknown } | null)?.error ===
            "string"
          ) ?
            (responseBody as { error?: string }).error
          : "Failed to update integration settings";
        throw new Error(message);
      }
      const next = normalizeIntegrationsConfig(
        (responseBody as { integrations?: unknown } | null)?.integrations,
      );
      setIntegrationsConfig(next);
      closeIntegrationsDialog(next);
      const nextProvider = next?.provider ?? "none";
      const nextLabel =
        nextProvider === "clickup" ? "ClickUp"
        : nextProvider === "jira" ? "Jira"
        : "Issue";
      const toastMessage =
        nextProvider === "none" ?
          previousProvider === "none" ?
            "Issue integration updated"
          : "Issue integration disabled"
        : previousProvider === nextProvider ? `${nextLabel} integration updated`
        : `${nextLabel} integration enabled`;
      toast.success(toastMessage, {
        position: "bottom-right",
      });
    } catch (error) {
      const message =
        error instanceof Error ?
          error.message
        : "Failed to update integration settings";
      setIntegrationsDialogError(message);
    } finally {
      setIntegrationsSaving(false);
    }
  };

  const renderIntegrationsBadge = () => {
    if (!organizationId) return null;
    if (canManageOrganization) {
      return (
        <button
          type="button"
          onClick={() => openIntegrationsDialog()}
          disabled={integrationsLoading}
          className={`group inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
            integrationEnabled ?
              "border-emerald-500/80 text-emerald-400 hover:bg-emerald-500/10"
            : "border-destructive/60 text-destructive hover:bg-destructive/10"
          } ${integrationsLoading ? "opacity-80" : ""}`}
          title="Manage issue integration"
        >
          {integrationsLoading ?
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Checking integrations…</span>
            </>
          : <>
              <span
                className={`inline-flex h-2 w-2 rounded-full ${integrationEnabled ? "bg-emerald-400" : "bg-destructive"}`}
              />
              <span className="uppercase tracking-wide">
                {integrationEnabled ? integrationProviderLabel : " integration"}
              </span>
              <span className="sr-only">
                {integrationEnabled ?
                  `${integrationProviderLabel} enabled`
                : "Issue integration disabled"}
              </span>
              <Switch
                aria-hidden="true"
                checked={integrationEnabled}
                disabled
                className="pointer-events-none border border-border/10 bg-muted/90 transition-colors group-hover:bg-muted/30 data-[state=checked]:border-emerald-300/40 data-[state=checked]:bg-emerald-400"
              />
            </>
          }
        </button>
      );
    }
    return (
      <Badge
        variant={integrationEnabled ? "secondary" : "outline"}
        className={integrationBadgeClassName}
        title={
          integrationEnabled ?
            `${integrationProviderLabel} is enabled for this organization`
          : "Issue integration is disabled for this organization"
        }
      >
        {integrationsLoading ?
          <>
            <Loader2 className="size-3 animate-spin" />
            Checking integrations…
          </>
        : <>
            {integrationEnabled ?
              `${integrationProviderLabel} enabled`
            : "No integration"}
          </>
        }
      </Badge>
    );
  };

  const startEdit = (st: TestStep) => {
    setEditingStepId(st.id);
    setEditTitle(st.title);
    setEditDesc(st.description);
    setEditExpectedResults(st.expectedResults ?? "");
  };

  const discardEdit = () => {
    setDiscardOpen(false);
    setEditingStepId(null);
    setEditTitle("");
    setEditDesc("");
    setEditExpectedResults("");
  };

  const saveEdit = async () => {
    if (
      !organizationId ||
      !project ||
      !activeModule ||
      !activeSection ||
      !editingStepId
    )
      return;
    const payload = {
      organizationId,
      projectId: project.id,
      moduleId: activeModule.id,
      sectionId: activeSection.id,
      stepId: editingStepId,
      title: editTitle.trim(),
      description: editDesc.trim(),
      expectedResults: editExpectedResults.trim(),
    };
    if (!payload.title || !payload.description) return;
    try {
      await fetch("/api/projects/step", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Optimistically update local projects tree
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== payload.projectId) return p;
          return {
            ...p,
            modules: p.modules.map((m) => {
              if (m.id !== payload.moduleId) return m;
              return {
                ...m,
                sections: m.sections.map((s) => {
                  if (s.id !== payload.sectionId) return s;
                  return {
                    ...s,
                    steps: s.steps.map((x) =>
                      x.id === payload.stepId ?
                        {
                          ...x,
                          title: payload.title,
                          description: payload.description,
                          expectedResults: payload.expectedResults,
                        }
                      : x,
                    ),
                  };
                }),
              };
            }),
          };
        }),
      );
      setEditingStepId(null);
      setEditTitle("");
      setEditDesc("");
    } catch {}
  };

  const startEditComment = (stepId: string) => {
    setEditingCommentStepId(stepId);
    setCommentDraft(getStepComment(sectionKey, stepId));
  };

  const cancelEditComment = () => {
    setEditingCommentStepId(null);
    setCommentDraft("");
  };

  const saveComment = async (stepId: string) => {
    if (
      !organizationId ||
      !project ||
      !activeModule ||
      !activeSection ||
      !sectionKey
    ) {
      cancelEditComment();
      return;
    }
    const comment = commentDraft.trim();
    // optimistic local update (preserve current status)
    setRuns((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [stepId]: {
          ...(prev[sectionKey]?.[stepId] ?? {
            status: "blocked" as StepStatus,
          }),
          comment,
        },
      },
    }));
    try {
      await fetch("/api/runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId: project.id,
          moduleId: activeModule.id,
          sectionId: activeSection.id,
          stepId,
          status: getStepStatus(sectionKey, stepId),
          comment,
        }),
      });
    } finally {
      cancelEditComment();
    }
  };

  // old duplicateModule(mod) removed; using openDuplicateModule + duplicateModule()

  const requestDelete = (target: {
    type: "project" | "module" | "section" | "step";
    id: string;
    name: string;
  }) => {
    setDeleteTarget(target);
    setDeleteOpen(true);
  };

  const performDelete = async () => {
    if (!organizationId || !project || !deleteTarget) return;
    try {
      if (deleteTarget.type === "project") {
        await fetch("/api/projects", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, projectId: deleteTarget.id }),
        });
      } else if (deleteTarget.type === "module") {
        await fetch("/api/projects/module", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            projectId: project.id,
            moduleId: deleteTarget.id,
          }),
        });
      } else if (deleteTarget.type === "section") {
        await fetch("/api/projects/section", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            projectId: project.id,
            moduleId: activeModule?.id,
            sectionId: deleteTarget.id,
          }),
        });
      } else if (deleteTarget.type === "step") {
        await fetch("/api/projects/step", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            projectId: project.id,
            moduleId: activeModule?.id,
            sectionId: activeSection?.id,
            stepId: deleteTarget.id,
          }),
        });
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      await refreshProjectsPreserve();
    } catch {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const quickPassSection = () => {
    if (!organizationId || !project || !activeModule || !activeSection) return;
    const key = getSectionKey(
      organizationId,
      project.id,
      activeModule.id,
      activeSection.id,
    );
    const beforeAllPassed = activeSection.steps.every(
      (st) => getStepStatus(key, st.id) === "passed",
    );
    setRuns((prev) => ({
      ...prev,
      [key]: activeSection.steps.reduce<Record<string, StepRun>>(
        (acc, st) => {
          acc[st.id] = {
            ...(prev[key]?.[st.id] ?? { status: "untested" }),
            status: "passed",
          };
          return acc;
        },
        { ...(prev[key] ?? {}) },
      ),
    }));
    // persist in background
    Promise.all(
      activeSection.steps.map((st) =>
        fetch(`/api/runs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            projectId: project.id,
            moduleId: activeModule.id,
            sectionId: activeSection.id,
            stepId: st.id,
            status: "passed",
          }),
        }).catch(() => undefined),
      ),
    ).catch(() => undefined);
    if (!beforeAllPassed && activeSection.steps.length > 0) {
      setSectionCompleteName(activeSection.name);
      setSectionCompleteOpen(true);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      setIntegrationsConfig(null);
      setIntegrationsLoading(false);
      setIntegrationsDialogError("");
      return;
    }
    setIntegrationsLoading(true);
    setIntegrationsDialogError("");
    const run = async () => {
      try {
        const res = await fetch(
          `/api/organizations/${organizationId}/integrations`,
        );
        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {}
        if (cancelled) return;
        if (!res.ok) {
          setIntegrationsConfig(null);
          return;
        }
        const next = normalizeIntegrationsConfig(
          (payload as { integrations?: unknown } | null)?.integrations,
        );
        setIntegrationsConfig(next);
      } catch {
        if (!cancelled) setIntegrationsConfig(null);
      } finally {
        if (!cancelled) setIntegrationsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    setRuns({});
    setProjectId("");
    setModuleId("");
    setSectionId("");
  }, [organizationId]);

  const handleCreateOrganization = async () => {
    const id = organizationFormId.trim();
    const name = organizationFormName.trim();
    if (!id || !name) {
      setOrganizationFormError("Organization id and name are required");
      return;
    }
    setOrganizationFormSubmitting(true);
    setOrganizationFormError("");
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create organization");
      }
      setOrganizationId(id);
      await loadOrganizations();
      setOrganizationFormId("");
      setOrganizationFormName("");
      setOrganizationFormOpen(false);
    } catch (error) {
      setOrganizationFormError(
        error instanceof Error ?
          error.message
        : "Failed to create organization",
      );
    } finally {
      setOrganizationFormSubmitting(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!organizationId) return;
    setInviteLoading(true);
    // setInviteFeedback(null) // już niepotrzebne
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create invitation");
      }

      const token = String(data.token);
      const link = `${window.location.origin}/invite/${token}`;

      try {
        await navigator.clipboard.writeText(link);
        toast.success("Invitation link copied to clipboard", {
          position: "bottom-right",
        });
      } catch {
        toast("Invitation link", {
          action: {
            label: "Copy",
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(link);
                toast.success("Copied!");
              } catch {
                toast.error("Copy failed — select & copy manually");
              }
            },
          },
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invitation",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleExportResults = async () => {
    if (!organizationId || !project) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        organizationId,
        projectId: project.id,
      });
      const res = await fetch(`/api/runs/export?${params.toString()}`);
      if (!res.ok) {
        let message = "Failed to export results";
        try {
          const data = await res.json();
          if (typeof data?.error === "string") message = data.error;
        } catch {}
        throw new Error(message);
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = slugify(project.name || "test-results");
      const fileName = `${baseName || "test-results"}-${stamp}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export results";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organizationId) {
        setProjects([]);
        setProjectId("");
        setModuleId("");
        setSectionId("");
        setRuns({});
        setLoadingProjects(false);
        return;
      }
      setLoadingProjects(true);
      try {
        const params = new URLSearchParams({ organizationId });
        const res = await fetch(`/api/projects?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          const raw =
            Array.isArray(data?.projects) ?
              (data.projects as ApiProject[])
            : [];
          const mapped = mapApiProjects(raw);
          setProjects(mapped);
          if (!mapped.length) {
            setProjectId("");
            setModuleId("");
            setSectionId("");
          }
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // Initialize selection when projects or organization change
  useEffect(() => {
    if (!projects.length) {
      setProjectId("");
      setModuleId("");
      setSectionId("");
      return;
    }

    const ensureProject = () => {
      const current = projects.find((p) => p.id === projectId);
      if (current) return current;
      return projects[0];
    };

    const nextProject = ensureProject();
    if (nextProject.id !== projectId) {
      setProjectId(nextProject.id);
      const firstModule = nextProject.modules[0];
      setModuleId(firstModule?.id ?? "");
      setSectionId(firstModule?.sections[0]?.id ?? "");
      return;
    }

    if (!nextProject.modules.length) {
      if (moduleId) setModuleId("");
      if (sectionId) setSectionId("");
      return;
    }

    const currentModule =
      nextProject.modules.find((m) => m.id === moduleId) ??
      nextProject.modules[0];
    if (currentModule.id !== moduleId) {
      setModuleId(currentModule.id);
      setSectionId(currentModule.sections[0]?.id ?? "");
      return;
    }

    if (!currentModule.sections.length) {
      if (sectionId) setSectionId("");
      return;
    }

    if (!currentModule.sections.some((s) => s.id === sectionId)) {
      setSectionId(currentModule.sections[0].id);
    }
  }, [projects, projectId, moduleId, sectionId]);

  // Fetch run state for active section
  useEffect(() => {
    const loadRun = async () => {
      if (!organizationId || !project || !activeModule || !activeSection)
        return;
      setLoadingRun(true);
      try {
        const params = new URLSearchParams({
          organizationId,
          projectId: project.id,
          moduleId: activeModule.id,
          sectionId: activeSection.id,
        });
        const res = await fetch(`/api/runs?${params.toString()}`);
        const data = await res.json();
        const key = getSectionKey(
          organizationId,
          project.id,
          activeModule.id,
          activeSection.id,
        );
        const rawSteps = (data?.run?.steps ?? {}) as Record<string, RawStepRun>;
        const normalized: Record<string, StepRun> = {};
        for (const [id, value] of Object.entries(rawSteps)) {
          normalized[id] = {
            status: value?.status ?? "untested",
            comment:
              typeof value?.comment === "string" ? value.comment : undefined,
            externalTask: normalizeStepIssue(value?.externalTask),
            jiraIssue: normalizeStepIssue(value?.jiraIssue, "jira"),
          };
        }
        setRuns((prev) => ({ ...prev, [key]: normalized }));
      } finally {
        setLoadingRun(false);
      }
    };
    loadRun();
  }, [
    organizationId,
    projectId,
    moduleId,
    sectionId,
    project,
    activeModule,
    activeSection,
  ]);

  // Realtime updates via Pusher
  useEffect(() => {
    let channel: PusherChannel | null = null;
    let presence: PusherChannel | null = null;
    const subscribe = async () => {
      if (!organizationId || !project || !activeModule || !activeSection)
        return;
      try {
        const { getPusherClient } = await import("@/lib/pusher-client");
        const pusher = getPusherClient();
        const name = `private-section-${organizationId}|${project.id}|${activeModule.id}|${activeSection.id}`;
        channel = pusher.subscribe(name);
        channel.bind("step-updated", (...args: unknown[]) => {
          const payload = parseStepUpdatedPayload(args[0]);
          if (!payload) return;
          const key = getSectionKey(
            organizationId,
            project.id,
            activeModule.id,
            activeSection.id,
          );
          setRuns((prev) => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? {}),
              [payload.stepId]: {
                ...(prev[key]?.[payload.stepId] ?? { status: "untested" }),
                status: payload.status,
                comment:
                  payload.comment ?? prev[key]?.[payload.stepId]?.comment,
                externalTask:
                  payload.externalTask ??
                  prev[key]?.[payload.stepId]?.externalTask,
                jiraIssue:
                  payload.jiraIssue ?? prev[key]?.[payload.stepId]?.jiraIssue,
              },
            },
          }));
        });

        // presence channel (viewer count)
        const presenceName = `presence-section-${organizationId}|${project.id}|${activeModule.id}|${activeSection.id}`;
        presence = pusher.subscribe(presenceName);
        const updateCount = () => {
          try {
            const count = (presence?.members?.count as number) ?? 0;
            setViewerCount(count);
          } catch {
            setViewerCount(0);
          }
        };
        presence.bind("pusher:subscription_succeeded", updateCount);
        presence.bind("pusher:member_added", updateCount);
        presence.bind("pusher:member_removed", updateCount);
      } catch {
        // Missing NEXT_PUBLIC_PUSHER_* keys or client not available; skip realtime gracefully
        setViewerCount(0);
      }
    };
    subscribe();
    return () => {
      try {
        channel?.unsubscribe();
      } catch {}
      try {
        presence?.unsubscribe();
      } catch {}
      setViewerCount(0);
    };
  }, [
    organizationId,
    projectId,
    moduleId,
    sectionId,
    project,
    activeModule,
    activeSection,
  ]);

  // Listen for structure updates and step changes globally; refresh/merge so UI updates live and efficent
  useEffect(() => {
    let chan: PusherChannel | null = null;
    const run = async () => {
      if (!organizationId) return;
      try {
        const { getPusherClient } = await import("@/lib/pusher-client");
        const p = getPusherClient();
        chan = p.subscribe(`presence-tmt-${organizationId}`);
        chan.bind("structure-updated", (...args: unknown[]) => {
          const payload = parseStructureUpdatedPayload(args[0]);
          if (!payload) return;
          if (payload.organizationId !== organizationId) return;
          refreshProjectsPreserve();
        });
        chan.bind("step-updated", (...args: unknown[]) => {
          const payload = parseStepBroadcastPayload(args[0]);
          if (!payload) return;
          if (payload.organizationId !== organizationId) return;
          if (!project || payload.projectId !== project.id) return;
          const key = getSectionKey(
            payload.organizationId,
            payload.projectId,
            payload.moduleId,
            payload.sectionId,
          );
          setRuns((prev) => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? {}),
              [payload.stepId]: {
                ...(prev[key]?.[payload.stepId] ?? { status: "untested" }),
                status: payload.status,
                comment:
                  payload.comment ?? prev[key]?.[payload.stepId]?.comment,
                externalTask:
                  payload.externalTask ??
                  prev[key]?.[payload.stepId]?.externalTask,
                jiraIssue:
                  payload.jiraIssue ?? prev[key]?.[payload.stepId]?.jiraIssue,
              },
            },
          }));
        });
      } catch {}
    };
    run();
    return () => {
      try {
        chan?.unsubscribe();
      } catch {}
    };
  }, [organizationId, projectId, project, refreshProjectsPreserve]);

  if (loadingOrganizations) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading organizations…
        </div>
      </div>
    );
  }

  if (!organizations.length) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              Create your first workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up an organization to keep projects, modules, and runs scoped
              to your team.
            </p>
          </div>
          <div className="space-y-3 text-left">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                Organization ID (slug)
              </span>
              <input
                value={organizationFormId}
                onChange={(e) => setOrganizationFormId(e.target.value)}
                placeholder="acme"
                className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Display name</span>
              <input
                value={organizationFormName}
                onChange={(e) => setOrganizationFormName(e.target.value)}
                placeholder="Acme QA"
                className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </label>
            {organizationFormError && (
              <div className="text-xs text-destructive">
                {organizationFormError}
              </div>
            )}
            <Button
              onClick={handleCreateOrganization}
              disabled={
                organizationFormSubmitting ||
                !organizationFormId.trim() ||
                !organizationFormName.trim()
              }
              className="w-full"
            >
              {organizationFormSubmitting ?
                <Loader2 className="size-4 animate-spin" />
              : "Create organization"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen w-full p-4 flex flex-col overflow-hidden">
      {/* Top bar: Project selector (left) + Back arrow (right) + live viewers */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full max-w-[920px]">
          <Select
            value={organizationId}
            onValueChange={(value) => setOrganizationId(value)}
          >
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageOrganization && (
            <Button
              className="h-[36px]"
              variant="outline"
              size="sm"
              onClick={() => setOrganizationFormOpen((prev) => !prev)}
            >
              {organizationFormOpen ? "Cancel" : "+"}
            </Button>
          )}
          <Select
            value={projectId}
            onValueChange={handleSelectProject}
            disabled={!projects.length}
          >
            <SelectTrigger className="min-w-[240px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules, sections, steps…"
            className="ml-3 flex-1 rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={handleExportResults}
            disabled={!project || exporting}
          >
            {exporting ?
              <>
                <Loader2 className="size-4 animate-spin" />
                Exporting...
              </>
            : "Export Excel"}
          </Button>
          {canManageOrganization && (
            <Link href="/tmt/admin">
              <Button size="sm" className="shrink-0">
                + add
              </Button>
            </Link>
          )}
          {canManageOrganization && project && (
            <Button
              size="sm"
              variant="destructive"
              className="shrink-0 inline-flex items-center gap-1.5"
              onClick={() =>
                requestDelete({
                  type: "project",
                  id: project.id,
                  name: project.name,
                })
              }
              disabled={!projectId}
            >
              <Trash className="size-4" />
              Delete project
            </Button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {themeMounted && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-2 py-1 text-xs text-muted-foreground">
                <Sun
                  className={`size-3.5 ${isDarkMode ? "text-muted-foreground/50" : "text-foreground"}`}
                />
                <Switch
                  aria-label="Toggle color theme"
                  checked={isDarkMode}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                  className="border border-border/40 bg-muted/80 transition-colors data-[state=checked]:bg-foreground/70 data-[state=checked]:border-foreground/40"
                />
                <Moon
                  className={`size-3.5 ${isDarkMode ? "text-foreground" : "text-muted-foreground/50"}`}
                />
              </div>
            )}
            {renderIntegrationsBadge()}
            {canManageOrganization && (
              <button
                type="button"
                onClick={handleCreateInvite}
                disabled={inviteLoading}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                  inviteLoading ?
                    "border-muted/40 text-muted-foreground opacity-80"
                  : "border-primary/60 text-primary hover:bg-primary/10"
                }`}
                title="Generate invite link"
              >
                {inviteLoading ?
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Generating…</span>
                  </>
                : <>
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span className="tracking-wide">Invite</span>
                  </>
                }
              </button>
            )}
            {/* <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{viewerCount || 0} viewing</span>
            </div> */}
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Link>
            <SignedIn>
              <div className="flex items-center gap-2 pl-1">
                <NotificationsBell />
                <UserButton
                  appearance={{ elements: { userButtonAvatarBox: "size-9" } }}
                  afterSignOutUrl="/"
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
      {organizationFormOpen && canManageOrganization && (
        <div className="mb-4 w-full max-w-[640px] rounded-lg border bg-background p-4">
          <div className="text-sm font-medium mb-2">
            Create new organization
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Organization ID</span>
              <input
                value={organizationFormId}
                onChange={(e) => setOrganizationFormId(e.target.value)}
                placeholder="acme"
                className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Display name</span>
              <input
                value={organizationFormName}
                onChange={(e) => setOrganizationFormName(e.target.value)}
                placeholder="Acme QA"
                className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </label>
          </div>
          {organizationFormError && (
            <div className="mt-2 text-xs text-destructive">
              {organizationFormError}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleCreateOrganization}
              disabled={
                organizationFormSubmitting ||
                !organizationFormId.trim() ||
                !organizationFormName.trim()
              }
            >
              {organizationFormSubmitting ?
                <Loader2 className="size-4 animate-spin" />
              : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOrganizationFormOpen(false);
                setOrganizationFormError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main layout: modules sidebar + sections and steps */}
      <div className="flex gap-6 flex-1 min-h-0 min-w-0">
        {loadingProjects && (
          <div className="text-sm text-muted-foreground">Loading projects…</div>
        )}
        {!loadingProjects && !project && (
          <div className="text-sm text-muted-foreground">No projects</div>
        )}
        {/* Modules sidebar */}
        <aside className="w-[260px] shrink-0 rounded-lg border h-full flex flex-col bg-card/40">
          <div className="border-b px-4 py-3 text-sm font-medium flex items-center min-h-[3.5rem]">
            Modules
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="py-0">
              <div className="flex flex-col">
                {filteredModules.map((m) => {
                  const active = m.id === moduleId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModule(m.id)}
                      className={`relative flex w-full items-center justify-between gap-3 px-4 py-3 text-sm transition-colors border-b last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                        active ?
                          "bg-accent/40 text-foreground"
                        : "hover:bg-accent/20 text-muted-foreground"
                      }`}
                    >
                      <span className="truncate font-medium text-left">
                        {m.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <button
                          aria-label="Duplicate module"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDuplicateModule(m);
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-transparent p-1.5 hover:bg-accent hover:text-foreground transition-colors"
                          title="Duplicate module"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          aria-label="Delete module"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete({
                              type: "module",
                              id: m.id,
                              name: m.name,
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-transparent p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete module"
                        >
                          <Trash className="size-3.5" />
                        </button>
                      </span>
                    </button>
                  );
                })}
                {!filteredModules.length && (
                  <div className="px-4 py-6 text-xs text-muted-foreground">
                    No modules
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Sections and Steps split */}
        <div className="flex w-full gap-6 h-full min-h-0 min-w-0">
          {/* Sections list */}
          <div className="w-1/2 min-w-0 rounded-lg border h-full flex flex-col relative">
            {/* Progress bar attached to top of the card */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <div
                  className="absolute left-0 right-0 top-0 flex h-1.5 rounded-t-lg bg-input/60 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={moduleProgress.total}
                  aria-valuenow={
                    moduleProgress.total - moduleProgress.counts.untested
                  }
                  aria-valuetext={progressSegments
                    .map((segment) =>
                      moduleProgress.total > 0 ?
                        `${segment.label} ${segment.count}/${moduleProgress.total}`
                      : `${segment.label} ${segment.count}`,
                    )
                    .join(", ")}
                  title={progressSegments
                    .map((segment) =>
                      moduleProgress.total > 0 ?
                        `${segment.label}: ${segment.count}/${moduleProgress.total}`
                      : `${segment.label}: ${segment.count}`,
                    )
                    .join(" | ")}
                >
                  {activeProgressSegments.length > 0 &&
                    activeProgressSegments.map((segment, index) => (
                      <div
                        key={segment.key}
                        className={`h-full transition-all ${segment.className} ${index === 0 ? "rounded-tl-lg" : ""} ${index === activeProgressSegments.length - 1 ? "rounded-tr-lg" : ""}`}
                        style={{ width: `${segment.pct}%` }}
                      />
                    ))}
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="text-xs w-auto py-2 px-3 space-y-1">
                <div className="font-medium">Progress</div>
                {progressSegments.map((segment) => (
                  <div
                    key={segment.key}
                    className="flex items-center justify-between gap-4 whitespace-nowrap"
                  >
                    <span className="text-muted-foreground">
                      {segment.label}
                    </span>
                    <span>
                      {moduleProgress.total > 0 ?
                        `${segment.count}/${moduleProgress.total}`
                      : segment.count}
                      {moduleProgress.total > 0 ?
                        ` (${Math.round(segment.pct)}%)`
                      : ""}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-1 text-muted-foreground">
                  <span>Total</span>
                  <span>{moduleProgress.total}</span>
                </div>
              </HoverCardContent>
            </HoverCard>
            <div className="border-b px-4 py-3 text-sm font-medium flex items-center min-h-[3.5rem]">
              Sections
            </div>
            <div className="divide-y flex-1 overflow-y-auto">
              {filteredSections.map((sec) => {
                const sStatus = computeSectionStatus(sec);
                const stepsPassed =
                  project && activeModule && organizationId ?
                    sec.steps.filter(
                      (st) =>
                        getStepStatus(
                          getSectionKey(
                            organizationId,
                            project.id,
                            activeModule.id,
                            sec.id,
                          ),
                          st.id,
                        ) === "passed",
                    ).length
                  : 0;
                return (
                  <div
                    key={sec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSectionId(sec.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSectionId(sec.id);
                      }
                    }}
                    className={`group w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors ${
                      sec.id === sectionId ? "bg-accent/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{sec.name}</div>
                      <div className="flex items-center gap-2">
                        {statusBadge(sStatus)}
                        <div className="text-xs text-muted-foreground">
                          {stepsPassed}/{sec.steps.length}
                        </div>
                        <button
                          aria-label="Delete section"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete({
                              type: "section",
                              id: sec.id,
                              name: sec.name,
                            });
                          }}
                          className="inline-flex p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete section"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!activeModule?.sections?.length && (
                <div className="px-4 py-8 text-sm text-muted-foreground">
                  No sections
                </div>
              )}
            </div>
          </div>

          {/* Steps panel */}
          <div className="w-1/2 min-w-0 rounded-lg border h-full flex flex-col">
            <div className="border-b px-4 py-3 text-sm flex items-center justify-between gap-3 min-h-[3.5rem]">
              <div className="font-medium">Test Steps</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStepSort((s) => (s === "asc" ? "desc" : "asc"))
                  }
                >
                  {stepSort === "asc" ?
                    <>
                      <ChevronUp className="size-4" /> Sort: Ascending
                    </>
                  : <>
                      <ChevronDown className="size-4" /> Sort: Descending
                    </>
                  }
                </Button>
                <Button size="sm" variant="outline" onClick={quickPassSection}>
                  Quick pass
                </Button>
              </div>
            </div>
            {!activeSection && (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                Select a section to view steps
              </div>
            )}
            {activeSection && (
              <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                {loadingRun && (
                  <div className="text-xs text-muted-foreground">Loading…</div>
                )}
                {(q ?
                  sortedSteps(activeSection).filter(
                    (st) =>
                      st.title.toLowerCase().includes(q) ||
                      st.description.toLowerCase().includes(q) ||
                      st.expectedResults.toLowerCase().includes(q),
                  )
                : sortedSteps(activeSection)
                ).map((step, idx) => {
                  const s = getStepStatus(sectionKey, step.id);
                  const issue = getStepIssue(sectionKey, step.id);
                  const issueCreatedAt =
                    issue?.createdAt ?
                      new Date(issue.createdAt).toLocaleString()
                    : undefined;
                  const issueProviderLabel =
                    issue?.provider === "clickup" ? "ClickUp" : "Jira";
                  const displayNum =
                    stepSort === "asc" ?
                      idx + 1
                    : activeSection.steps.length - idx;
                  const isEditing = editingStepId === step.id;
                  return (
                    <div
                      key={step.id}
                      className="group relative rounded-md border p-4"
                    >
                      {/* Status badge in top-right corner */}
                      <div className="absolute top-2 right-2 pointer-events-none">
                        {statusBadge(s)}
                      </div>

                      <div className="mb-2 flex items-center justify-between gap-3 pr-12">
                        <div className="font-medium">
                          {isEditing ?
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                              placeholder="Step title"
                            />
                          : <>
                              {displayNum}. {step.title}
                            </>
                          }
                        </div>
                      </div>
                      <div className="mb-3 text-sm">
                        <div className="text-xs font-medium text-muted-foreground">
                          Description
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {isEditing ?
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              rows={3}
                              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                              placeholder="Step description"
                            />
                          : <div
                              onDoubleClick={() => startEdit(step)}
                              className="cursor-text"
                            >
                              {step.description}
                            </div>
                          }
                        </div>
                        <div className="mt-3 text-xs font-medium text-muted-foreground">
                          Expected results
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {isEditing ?
                            <textarea
                              value={editExpectedResults}
                              onChange={(e) =>
                                setEditExpectedResults(e.target.value)
                              }
                              rows={3}
                              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                              placeholder="Expected results"
                            />
                          : <div
                              onDoubleClick={() => startEdit(step)}
                              className="cursor-text min-h-[1.25rem]"
                            >
                              {step.expectedResults ?
                                step.expectedResults
                              : <span className="text-muted-foreground/60 italic">
                                  No expected results
                                </span>
                              }
                            </div>
                          }
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mb-3 flex items-center gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDiscardOpen(true)}
                          >
                            Discard
                          </Button>
                        </div>
                      )}
                      {s === "blocked" && (
                        <div className="mb-3">
                          {editingCommentStepId === step.id ?
                            <textarea
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              onBlur={() => saveComment(step.id)}
                              placeholder="Dodaj komentarz do blokady..."
                              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                              rows={3}
                              autoFocus
                            />
                          : <div
                              onDoubleClick={() => startEditComment(step.id)}
                              className="cursor-text whitespace-pre-wrap"
                            >
                              {getStepComment(sectionKey, step.id) || (
                                <span className="text-muted-foreground italic">
                                  Double‑click to add a comment…
                                </span>
                              )}
                            </div>
                          }
                        </div>
                      )}
                      {(s === "failed" || issue) && (
                        <div className="mt-3 flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                          {issue ?
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium text-destructive">
                                {issueProviderLabel} task:
                              </span>
                              <Button
                                variant="link"
                                size="sm"
                                className="px-0"
                                asChild
                              >
                                <Link
                                  href={issue.url ?? "#"}
                                  target={issue.url ? "_blank" : undefined}
                                  rel={issue.url ? "noreferrer" : undefined}
                                  className="flex items-center gap-1"
                                >
                                  {issue.key}
                                  <ExternalLink className="size-3.5" />
                                </Link>
                              </Button>
                              {issueCreatedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Created {issueCreatedAt}
                                </span>
                              )}
                            </div>
                          : integrationEnabled ?
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-sm text-muted-foreground">
                                Escalate this failure to{" "}
                                {integrationProviderLabel}.
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => createExternalTask(step)}
                                disabled={creatingIssueFor === step.id}
                              >
                                {creatingIssueFor === step.id ?
                                  <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Creating task…
                                  </>
                                : `Create ${integrationProviderLabel} task`}
                              </Button>
                            </div>
                          : <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-sm font-medium text-destructive">
                                Issue integration is disabled
                              </div>
                              {canManageOrganization ?
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openIntegrationsDialog()}
                                  disabled={
                                    integrationsLoading || integrationsSaving
                                  }
                                >
                                  {integrationsLoading || integrationsSaving ?
                                    <>
                                      <Loader2 className="size-4 animate-spin" />
                                      Please wait…
                                    </>
                                  : "Configure"}
                                </Button>
                              : <div className="text-xs text-muted-foreground">
                                  Ask an administrator to enable Jira or ClickUp
                                  for this organization.
                                </div>
                              }
                            </div>
                          }
                          {integrationErrors[step.id] && (
                            <div className="text-xs text-destructive">
                              {integrationErrors[step.id]}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant={s === "failed" ? "destructive" : "outline"}
                            onClick={() =>
                              setStepStatus(sectionKey, step.id, "failed")
                            }
                          >
                            Failed
                          </Button>
                          <Button
                            variant={s === "blocked" ? "secondary" : "outline"}
                            onClick={() =>
                              setStepStatus(sectionKey, step.id, "blocked")
                            }
                          >
                            Blocked
                          </Button>
                          <Button
                            variant={s === "passed" ? "default" : "outline"}
                            onClick={() => {
                              if (activeSection && sectionKey) {
                                const beforeAllPassed =
                                  activeSection.steps.every(
                                    (st) =>
                                      getStepStatus(sectionKey, st.id) ===
                                      "passed",
                                  );
                                const afterAllPassed =
                                  activeSection.steps.every((st) =>
                                    st.id === step.id ?
                                      true
                                    : getStepStatus(sectionKey, st.id) ===
                                      "passed",
                                  );
                                if (!beforeAllPassed && afterAllPassed) {
                                  setSectionCompleteName(activeSection.name);
                                  setSectionCompleteOpen(true);
                                }
                              }
                              setStepStatus(sectionKey, step.id, "passed");
                            }}
                          >
                            Passed
                          </Button>
                          <Button
                            variant={s === "untested" ? "outline" : "outline"}
                            onClick={() =>
                              setStepStatus(sectionKey, step.id, "untested")
                            }
                          >
                            Reset
                          </Button>
                        </div>
                        <button
                          aria-label="Delete step"
                          onClick={() =>
                            requestDelete({
                              type: "step",
                              id: step.id,
                              name: step.title,
                            })
                          }
                          className="inline-flex p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete step"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Issue integration configuration dialog */}
      <AlertDialog
        open={integrationsDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeIntegrationsDialog(integrationsConfig);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Manage issue integration</AlertDialogTitle>
          <AlertDialogDescription>
            Choose where failed test steps should be escalated for this
            workspace.
          </AlertDialogDescription>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["none", "No integration"],
                  ["jira", "Jira"],
                  ["clickup", "ClickUp"],
                ] as Array<[IssueProvider, string]>
              ).map(([provider, label]) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() =>
                    setIntegrationsForm((prev) => ({ ...prev, provider }))
                  }
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    integrationsForm.provider === provider ?
                      "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {integrationsForm.provider === "jira" && (
              <div className="grid gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Base URL</span>
                  <input
                    value={integrationsForm.jira.baseUrl}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        jira: { ...prev.jira, baseUrl: e.target.value },
                      }))
                    }
                    placeholder="https://your-domain.atlassian.net"
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Email</span>
                  <input
                    type="email"
                    value={integrationsForm.jira.email}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        jira: { ...prev.jira, email: e.target.value },
                      }))
                    }
                    placeholder="qa@company.com"
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Project key</span>
                    <input
                      value={integrationsForm.jira.projectKey}
                      onChange={(e) =>
                        setIntegrationsForm((prev) => ({
                          ...prev,
                          jira: { ...prev.jira, projectKey: e.target.value },
                        }))
                      }
                      placeholder="QA"
                      className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Issue type</span>
                    <input
                      value={integrationsForm.jira.issueType}
                      onChange={(e) =>
                        setIntegrationsForm((prev) => ({
                          ...prev,
                          jira: { ...prev.jira, issueType: e.target.value },
                        }))
                      }
                      placeholder="Task"
                      className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">API token</span>
                  <input
                    type="password"
                    value={integrationsForm.jira.apiToken}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        jira: { ...prev.jira, apiToken: e.target.value },
                      }))
                    }
                    placeholder="Jira API token"
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
              </div>
            )}

            {integrationsForm.provider === "clickup" && (
              <div className="grid gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">List ID</span>
                  <input
                    value={integrationsForm.clickup.listId}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        clickup: { ...prev.clickup, listId: e.target.value },
                      }))
                    }
                    placeholder="901234567890"
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Status</span>
                  <input
                    value={integrationsForm.clickup.status}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        clickup: { ...prev.clickup, status: e.target.value },
                      }))
                    }
                    placeholder="to do"
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">API token</span>
                  <input
                    type="password"
                    value={integrationsForm.clickup.apiToken}
                    onChange={(e) =>
                      setIntegrationsForm((prev) => ({
                        ...prev,
                        clickup: { ...prev.clickup, apiToken: e.target.value },
                      }))
                    }
                    placeholder="pk_..."
                    className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </label>
              </div>
            )}

            {((integrationsForm.provider === "jira" &&
              integrationsConfig?.jira.hasToken) ||
              (integrationsForm.provider === "clickup" &&
                integrationsConfig?.clickup.hasToken)) && (
              <div className="text-xs text-muted-foreground">
                Leave the API token blank to keep the existing one on file.
              </div>
            )}
            {integrationUpdatedAtLabel && (
              <div className="text-xs text-muted-foreground">
                Last updated {integrationUpdatedAtLabel}
              </div>
            )}
            {integrationsDialogError && (
              <div className="text-xs text-destructive">
                {integrationsDialogError}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => closeIntegrationsDialog(integrationsConfig)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveIntegrationsConfig}
              disabled={integrationsSaving}
            >
              {integrationsSaving ?
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              : "Save changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Section Completed Alert */}
      <AlertDialog
        open={sectionCompleteOpen}
        onOpenChange={setSectionCompleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Section Completed</AlertDialogTitle>
          <AlertDialogDescription>
            {`All test steps in "${sectionCompleteName ?? ""}" are passed. Great job!`}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSectionCompleteOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Discard edits confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to this step. Do you want to discard them?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <AlertDialogAction onClick={discardEdit}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
          <AlertDialogDescription>
            {`This action cannot be undone. It will permanently remove "${deleteTarget?.name ?? ""}".`}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={performDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate module dialog */}
      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Duplicate module</AlertDialogTitle>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">
              New module name
            </label>
            <input
              value={dupName}
              onChange={(e) => setDupName(e.target.value)}
              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder={`${dupBase?.name ?? ""} Copy`}
            />
            <div className="text-xs text-muted-foreground">
              ID (slug):{" "}
              {dupName ?
                dupName
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .replace(/-+/g, "-")
                  .slice(0, 64)
              : ""}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDupOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={duplicateModule}>
              Duplicate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
