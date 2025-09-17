"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addModule, addSection, addStep, createProject } from "./actions";
import { ArrowLeft } from "lucide-react";

type Step = { id: string; title: string; description: string };
type Section = { id: string; name: string; steps: Step[] };
type Module = { id: string; name: string; sections: Section[] };
type Project = { id: string; name: string; modules: Module[] };

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [projectId, setProjectId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const moduleOptions = useMemo(() => (projects.find(p => p.id === projectId)?.modules ?? []), [projects, projectId]);
  const sectionOptions = useMemo(() => (moduleOptions.find(m => m.id === moduleId)?.sections ?? []), [moduleOptions, moduleId]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const list = (data?.projects ?? []) as Array<any>;
      setProjects(list.map((p) => ({ id: p._id, name: p.name, modules: p.modules?.map((m: any) => ({ id: m._id, name: m.name, sections: m.sections?.map((s: any) => ({ id: s._id, name: s.name, steps: s.steps?.map((st: any) => ({ id: st._id, title: st.title, description: st.description })) || [] })) || [] })) || [] })));
    } catch (e: any) {
      setMsg(e?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="h-screen w-full p-4 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="text-sm text-muted-foreground">Admin</div>
        <a href="/tmt" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="scale-75"/>
          Back to TMT
        </a>
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/2 min-w-0 rounded-lg border h-full p-4 overflow-y-auto">
        <div className="font-medium mb-3">Create Project</div>
        <ProjectForm onSuccess={async () => { await refresh(); setMsg('Project created'); }} />

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
        <ModuleForm projectId={projectId} onSuccess={async () => { await refresh(); setMsg('Module added'); }} />

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
        <SectionForm projectId={projectId} moduleId={moduleId} onSuccess={async () => { await refresh(); setMsg('Section added'); }} />
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
        <StepForm projectId={projectId} moduleId={moduleId} sectionId={sectionId} onSuccess={async () => { await refresh(); setMsg('Step added'); }} />

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
  return <input {...props} className={`rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${props.className ?? ''}`} />
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${props.className ?? ''}`} />
}

function ProjectForm({ onSuccess }: { onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await createProject({ id, name });
      setId(""); setName("");
      await onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Project ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="mwo" /></Field>
      <Field label="Project Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="MWO" /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!id || !name || submitting}>Create</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function ModuleForm({ projectId, onSuccess }: { projectId: string; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await addModule({ projectId, id, name });
      setId(""); setName("");
      await onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Module ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="monetization" /></Field>
      <Field label="Module Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Monetization" /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!projectId || !id || !name || submitting}>Add Module</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function SectionForm({ projectId, moduleId, onSuccess }: { projectId: string; moduleId: string; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await addSection({ projectId, moduleId, id, name });
      setId(""); setName("");
      await onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Section ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="so" /></Field>
      <Field label="Section Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="SO" /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!projectId || !moduleId || !id || !name || submitting}>Add Section</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

function StepForm({ projectId, moduleId, sectionId, onSuccess }: { projectId: string; moduleId: string; sectionId: string; onSuccess: () => Promise<void> | void }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      await addStep({ projectId, moduleId, sectionId, id, title, description });
      setId(""); setTitle(""); setDescription("");
      await onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Step ID (slug)"><Input value={id} onChange={e => setId(e.target.value)} placeholder="so-1" /></Field>
      <Field label="Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Open Store" /></Field>
      <Field label="Description"><Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Open the store from the main menu" /></Field>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={!projectId || !moduleId || !sectionId || !id || !title || !description || submitting}>Add Step</Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}
