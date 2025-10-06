"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addModule, addSection, addStep, createProject } from "./actions";
import { ArrowLeft } from "lucide-react";

type Step = { id: string; title: string; description: string };
type Section = { id: string; name: string; steps: Step[] };
type Module = { id: string; name: string; sections: Section[] };
type Project = { id: string; name: string; modules: Module[] };
type Organization = { id: string; name: string; role: "owner" | "admin" | "member" };
type ApiProject = {
  _id: string;
  name: string;
  modules?: Array<{
    _id: string;
    name: string;
    sections?: Array<{
      _id: string;
      name: string;
      steps?: Array<{ _id: string; title: string; description: string }>;
    }>;
  }>;
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
        steps: (s.steps ?? []).map((st) => ({ id: st._id, title: st.title, description: st.description })),
      })),
    })),
  }));

export default function AdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const moduleOptions = useMemo(() => (projects.find(p => p.id === projectId)?.modules ?? []), [projects, projectId]);
  const sectionOptions = useMemo(() => (moduleOptions.find(m => m.id === moduleId)?.sections ?? []), [moduleOptions, moduleId]);

  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === organizationId),
    [organizations, organizationId],
  );
  const canManage = activeOrganization?.role === "owner" || activeOrganization?.role === "admin";

  const loadOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    try {
      const res = await fetch('/api/organizations');
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

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setProjects([]);
      setProjectId("");
      setModuleId("");
      setSectionId("");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ organizationId });
      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      const raw = Array.isArray(data?.projects) ? (data.projects as ApiProject[]) : [];
      setProjects(mapApiProjects(raw));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { loadOrganizations(); }, [loadOrganizations]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!projects.length) {
      setProjectId("");
      setModuleId("");
      setSectionId("");
      return;
    }

    const currentProject = projects.find((p) => p.id === projectId) ?? projects[0];
    if (currentProject.id !== projectId) {
      setProjectId(currentProject.id);
      setModuleId(currentProject.modules[0]?.id ?? "");
      setSectionId(currentProject.modules[0]?.sections[0]?.id ?? "");
      return;
    }

    if (!currentProject.modules.length) {
      setModuleId("");
      setSectionId("");
      return;
    }

    const currentModule = currentProject.modules.find((m) => m.id === moduleId) ?? currentProject.modules[0];
    if (currentModule.id !== moduleId) {
      setModuleId(currentModule.id);
      setSectionId(currentModule.sections[0]?.id ?? "");
      return;
    }

    if (!currentModule.sections.length) {
      setSectionId("");
      return;
    }

    if (!currentModule.sections.some((s) => s.id === sectionId)) {
      setSectionId(currentModule.sections[0].id);
    }
  }, [projects, projectId, moduleId, sectionId]);

  return (
    <div className="h-screen w-full p-4 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="text-sm text-muted-foreground">Admin</div>
        <a href="/tmt" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="scale-75"/>
          Back to TMT
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="min-w-[220px]">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loadingOrganizations && !organizations.length && (
          <span className="text-xs text-muted-foreground">No organizations yet. Create one from the main TMT view.</span>
        )}
        {activeOrganization && !canManage && (
          <span className="text-xs text-muted-foreground">You have read-only access.</span>
        )}
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/2 min-w-0 rounded-lg border h-full p-4 overflow-y-auto">
        <div className="font-medium mb-3">Create Project</div>
        {loading && organizationId && (
          <div className="mb-2 text-xs text-muted-foreground">Loading projects…</div>
        )}
        <ProjectForm
          organizationId={organizationId}
          canManage={!!canManage}
          onSuccess={async () => { await refresh(); setMsg('Project created'); }}
        />

        <div className="h-px bg-border my-6" />

        <div className="font-medium mb-3">Import from Excel</div>
        <ImportForm
          organizationId={organizationId}
          canManage={!!canManage}
          onSuccess={async (message) => { await refresh(); setMsg(message); }}
        />

        <div className="h-px bg-border my-6" />

        <div className="font-medium mb-3">Add Module</div>
        <div className="flex flex-col gap-2 mb-3">
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setModuleId(""); setSectionId(""); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ModuleForm
          organizationId={organizationId}
          canManage={!!canManage}
          projectId={projectId}
          onSuccess={async () => { await refresh(); setMsg('Module added'); }}
        />

        <div className="h-px bg-border my-6" />

        <div className="font-medium mb-3">Add Section</div>
        <div className="flex flex-col gap-2 mb-3">
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setModuleId(""); setSectionId(""); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setSectionId(""); }} disabled={!projectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {moduleOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SectionForm
          organizationId={organizationId}
          canManage={!!canManage}
          projectId={projectId}
          moduleId={moduleId}
          onSuccess={async () => { await refresh(); setMsg('Section added'); }}
        />
      </div>

      <div className="w-1/2 min-w-0 rounded-lg border h-full p-4 overflow-y-auto">
        <div className="font-medium mb-3">Add Step</div>
        <div className="flex flex-col gap-2 mb-3">
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setModuleId(""); setSectionId(""); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={moduleId} onValueChange={(v) => { setModuleId(v); setSectionId(""); }} disabled={!projectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {moduleOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sectionId} onValueChange={setSectionId} disabled={!moduleId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <StepForm
          organizationId={organizationId}
          canManage={!!canManage}
          projectId={projectId}
          moduleId={moduleId}
          sectionId={sectionId}
          onSuccess={async () => { await refresh(); setMsg('Step added'); }}
        />

        {msg && (
          <div className="mt-6 text-xs text-muted-foreground">{msg}</div>
        )}
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm mb-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-60 disabled:cursor-not-allowed ${props.className ?? ''}`}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-60 disabled:cursor-not-allowed ${props.className ?? ''}`}
    />
  )
}

function ProjectForm({ organizationId, canManage, onSuccess }: { organizationId: string; canManage: boolean; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!canManage) {
      setError("You do not have permission to manage projects");
      return;
    }
    if (!organizationId) {
      setError("Select an organization first");
      return;
    }
    setSubmitting(true); setError("");
    try {
      await createProject({ id, name, organizationId });
      setId(""); setName("");
      await onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Project ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="mwo" disabled={!canManage} /></Field>
      <Field label="Project Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="MWO" disabled={!canManage} /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canManage || !id || !name || submitting}>Create</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function ImportForm({ organizationId, canManage, onSuccess }: { organizationId: string; canManage: boolean; onSuccess: (message: string) => Promise<void> | void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setInfo("");
    const newFile = event.target.files?.[0] ?? null;
    setFile(newFile);
  };

  const submit = async () => {
    if (!canManage) { setError("You do not have permission"); return; }
    if (!organizationId) { setError("Select organization"); return; }
    if (!file) { setError("Select a file to import"); return; }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId);
      const res = await fetch("/api/projects/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Import failed");
      }
      const summary = `Imported ${data?.stats?.projects ?? 0} projects (${data?.stats?.rows ?? 0} steps)`;
      setInfo(summary);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      await onSuccess(summary);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to import file");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="text-muted-foreground text-xs leading-5">
        Upload a spreadsheet (`.xlsx` or `.csv`) with columns:
        <span className="block mt-1 font-mono text-xs">
          projectId, projectName, moduleId, moduleName, sectionId, sectionName, stepId, stepTitle, stepDescription
        </span>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-muted-foreground">Spreadsheet file</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          disabled={!canManage}
          className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>
      <div className="flex gap-2 items-center">
        <Button onClick={submit} disabled={submitting || !file || !canManage}>Import</Button>
        {submitting && <span className="text-xs text-muted-foreground">Uploading…</span>}
      </div>
      {info && <div className="text-xs text-emerald-600">{info}</div>}
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}

function ModuleForm({ organizationId, projectId, canManage, onSuccess }: { organizationId: string; projectId: string; canManage: boolean; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!canManage) { setError('You do not have permission'); return; }
    if (!organizationId) { setError('Select organization'); return; }
    if (!projectId) { setError('Select project'); return; }
    setSubmitting(true); setError("");
    try {
      await addModule({ organizationId, projectId, id, name });
      setId(""); setName("");
      await onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Module ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="monetization" disabled={!canManage || !projectId} /></Field>
      <Field label="Module Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Monetization" disabled={!canManage || !projectId} /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canManage || !projectId || !id || !name || submitting}>Add Module</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function SectionForm({ organizationId, projectId, moduleId, canManage, onSuccess }: { organizationId: string; projectId: string; moduleId: string; canManage: boolean; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!canManage) { setError('You do not have permission'); return; }
    if (!organizationId) { setError('Select organization'); return; }
    if (!projectId || !moduleId) { setError('Select project and module'); return; }
    setSubmitting(true); setError("");
    try {
      await addSection({ organizationId, projectId, moduleId, id, name });
      setId(""); setName("");
      await onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Section ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="so" disabled={!canManage || !projectId || !moduleId} /></Field>
      <Field label="Section Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="SO" disabled={!canManage || !projectId || !moduleId} /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canManage || !projectId || !moduleId || !id || !name || submitting}>Add Section</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function StepForm({ organizationId, projectId, moduleId, sectionId, canManage, onSuccess }: { organizationId: string; projectId: string; moduleId: string; sectionId: string; canManage: boolean; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!canManage) { setError('You do not have permission'); return; }
    if (!organizationId) { setError('Select organization'); return; }
    if (!projectId || !moduleId || !sectionId) { setError('Select project, module and section'); return; }
    setSubmitting(true); setError("");
    try {
      await addStep({ organizationId, projectId, moduleId, sectionId, id, title, description });
      setId(""); setTitle(""); setDescription("");
      await onSuccess();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Step ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="so-1" disabled={!canManage || !projectId || !moduleId || !sectionId} /></Field>
      <Field label="Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Open Store" disabled={!canManage || !projectId || !moduleId || !sectionId} /></Field>
      <Field label="Description"><Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Open the store from the main menu" disabled={!canManage || !projectId || !moduleId || !sectionId} /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canManage || !projectId || !moduleId || !sectionId || !id || !title || !description || submitting}>Add Step</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}
