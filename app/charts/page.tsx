"use client";

import React, { useEffect, useMemo, useState } from "react";

type StepStatus = "untested" | "passed" | "failed" | "blocked";

type StepRun = { status: StepStatus; comment?: string };

type Step = { id: string; title: string; description: string };
type Section = { id: string; name: string; steps: Step[] };
type Module = { id: string; name: string; sections: Section[] };
type Project = { id: string; name: string; modules: Module[] };

type Counts = Record<StepStatus, number>;

const emptyCounts = (): Counts => ({ passed: 0, failed: 0, blocked: 0, untested: 0 });

function computeSectionStatus(stepStatuses: StepStatus[]): StepStatus {
  if (stepStatuses.length && stepStatuses.every((s) => s === "passed")) return "passed";
  if (stepStatuses.some((s) => s === "failed")) return "failed";
  if (stepStatuses.some((s) => s === "blocked")) return "blocked";
  if (stepStatuses.some((s) => s === "passed")) return "untested";
  return "untested";
}

function computeModuleStatus(sectionStatuses: StepStatus[]): StepStatus {
  if (sectionStatuses.length && sectionStatuses.every((s) => s === "passed")) return "passed";
  if (sectionStatuses.some((s) => s === "failed")) return "failed";
  if (sectionStatuses.some((s) => s === "blocked")) return "blocked";
  if (sectionStatuses.some((s) => s === "passed")) return "untested";
  return "untested";
}

function Pie({ title, counts }: { title: string; counts: Counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const palette: Record<StepStatus, string> = {
    passed: "var(--chart-2)",
    failed: "var(--destructive)",
    blocked: "var(--chart-5)",
    untested: "var(--muted)",
  };
  const order: StepStatus[] = ["passed", "failed", "blocked", "untested"];
  let acc = 0;
  const parts: string[] = [];
  if (total === 0) {
    parts.push(`${palette.untested} 0 100%`);
  } else {
    for (const key of order) {
      const val = counts[key];
      if (!val) continue;
      const start = acc;
      const pct = (val / total) * 100;
      const end = start + pct;
      parts.push(`${palette[key]} ${start}% ${end}%`);
      acc = end;
    }
    if (acc < 100) parts.push(`${palette.untested} ${acc}% 100%`);
  }
  const bg = `conic-gradient(${parts.join(", ")})`;
  return (
    <div className="rounded-lg border p-4 flex flex-col items-center gap-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="relative" style={{ width: 160, height: 160 }}>
        <div className="rounded-full border" style={{ width: 160, height: 160, background: bg }} />
        <div className="absolute inset-4 rounded-full border bg-background flex items-center justify-center">
          <div className="text-xs text-muted-foreground text-center">
            Total
            <div className="text-foreground text-base font-semibold">{total}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {order.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: palette[k] }} />
            <span className="capitalize">{k}</span>
            <span className="text-muted-foreground">{counts[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChartsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error('Failed to load projects');
        const data = await res.json();
        const list = ((data?.projects ?? []) as Array<any>).map((p) => ({
          id: p._id,
          name: p.name,
          modules: (p.modules ?? []).map((m: any) => ({
            id: m._id,
            name: m.name,
            sections: (m.sections ?? []).map((s: any) => ({
              id: s._id,
              name: s.name,
              steps: (s.steps ?? []).map((st: any) => ({ id: st._id, title: st.title, description: st.description })),
            })),
          })),
        })) as Project[];
        if (!cancelled) setProjects(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Error');
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true };
  }, []);

  const [stepCounts, sectionCounts, moduleCounts] = useMemo(() => {
    return [emptyCounts(), emptyCounts(), emptyCounts()] as [Counts, Counts, Counts];
  }, []);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const aggregate = async () => {
      if (!projects.length) { setReady(true); return; }
      const stepC = emptyCounts();
      const sectionC = emptyCounts();
      const moduleC = emptyCounts();

      // Fetch runs for all sections
      const sectionKeys: Array<{ projectId: string; moduleId: string; section: Section }> = [];
      for (const p of projects) {
        for (const m of p.modules) {
          for (const s of m.sections) sectionKeys.push({ projectId: p.id, moduleId: m.id, section: s });
        }
      }

      const results = await Promise.all(sectionKeys.map(async ({ projectId, moduleId, section }) => {
        const params = new URLSearchParams({ projectId, moduleId, sectionId: section.id });
        const res = await fetch(`/api/runs?${params.toString()}`);
        const data = await res.json();
        const run: Record<string, StepRun> = (data?.run?.steps ?? {})
        // Steps aggregation
        const statuses: StepStatus[] = [];
        for (const st of section.steps) {
          const stStatus = (run?.[st.id]?.status ?? 'untested') as StepStatus;
          statuses.push(stStatus);
          stepC[stStatus] += 1;
        }
        const secStatus = computeSectionStatus(statuses);
        sectionC[secStatus] += 1;
        return { projectId, moduleId, sectionId: section.id, secStatus };
      }));

      // Module aggregation from section statuses
      const byModule = new Map<string, StepStatus[]>();
      for (const r of results) {
        const key = `${r.projectId}|${r.moduleId}`;
        if (!byModule.has(key)) byModule.set(key, []);
        byModule.get(key)!.push(r.secStatus);
      }
      // Ensure modules with zero sections still counted as untested
      for (const p of projects) {
        for (const m of p.modules) {
          const key = `${p.id}|${m.id}`;
          const arr = byModule.get(key) ?? [];
          const modStatus = computeModuleStatus(arr);
          moduleC[modStatus] += 1;
        }
      }

      if (!cancelled) {
        // copy into state-like refs
        (stepCounts.passed = stepC.passed), (stepCounts.failed = stepC.failed), (stepCounts.blocked = stepC.blocked), (stepCounts.untested = stepC.untested);
        (sectionCounts.passed = sectionC.passed), (sectionCounts.failed = sectionC.failed), (sectionCounts.blocked = sectionC.blocked), (sectionCounts.untested = sectionC.untested);
        (moduleCounts.passed = moduleC.passed), (moduleCounts.failed = moduleC.failed), (moduleCounts.blocked = moduleC.blocked), (moduleCounts.untested = moduleC.untested);
        setReady(true);
      }
    };
    aggregate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-muted-foreground">Dashboard</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pie title="Steps" counts={stepCounts} />
        <Pie title="Sections" counts={sectionCounts} />
        <Pie title="Modules" counts={moduleCounts} />
      </div>
      {!ready && (
        <div className="mt-4 text-xs text-muted-foreground">Aggregating…</div>
      )}
    </div>
  );
}

