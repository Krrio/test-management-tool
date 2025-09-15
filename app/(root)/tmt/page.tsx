"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronUp, ArrowLeft, Copy, Trash } from "lucide-react"
import Link from "next/link"


type StepStatus = "untested" | "passed" | "failed" | "blocked"

type TestStep = {
  id: string
  title: string
  description: string
}

type StepRun = {
  status: StepStatus
  comment?: string
}

type Section = {
  id: string
  name: string
  steps: TestStep[]
}

type Module = {
  id: string
  name: string
  sections: Section[]
}

type Project = {
  id: string
  name: string
  modules: Module[]
}

// Data now fetched from API

type SectionRunKey = `${string}|${string}|${string}` // projectId|moduleId|sectionId

export default function TestCaseLabPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>("")
  const [moduleId, setModuleId] = useState<string>("")
  const [sectionId, setSectionId] = useState<string>("")
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingRun, setLoadingRun] = useState(false)

  // runs: map from sectionKey -> map of stepId -> { status, comment? }
  const [runs, setRuns] = useState<Record<SectionRunKey, Record<string, StepRun>>>({})
  const [sectionCompleteOpen, setSectionCompleteOpen] = useState(false)
  const [sectionCompleteName, setSectionCompleteName] = useState<string | undefined>(undefined)
  const [stepSort, setStepSort] = useState<"asc" | "desc">("asc")
  const [viewerCount, setViewerCount] = useState<number>(0)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>("")
  const [editDesc, setEditDesc] = useState<string>("")
  const [discardOpen, setDiscardOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'module'; id: string; name: string }
    | { type: 'section'; id: string; name: string }
    | { type: 'step'; id: string; name: string }
    | null
  >(null)
  const [dupOpen, setDupOpen] = useState(false)
  const [dupBase, setDupBase] = useState<Module | null>(null)
  const [dupName, setDupName] = useState("")
  const [search, setSearch] = useState("")

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const module = useMemo(() => project?.modules.find((m) => m.id === moduleId), [project, moduleId])
  const section = useMemo(() => module?.sections.find((s) => s.id === sectionId), [module, sectionId])

  const sectionKey = useMemo<SectionRunKey | undefined>(() => {
    if (!project || !module || !section) return undefined
    return `${project.id}|${module.id}|${section.id}`
  }, [project, module, section])

  const getSectionKey = (pId: string, mId: string, sId: string): SectionRunKey => `${pId}|${mId}|${sId}`

  const getStepStatus = (sKey: SectionRunKey | undefined, stepId: string): StepStatus => {
    if (!sKey) return "untested"
    const value = runs[sKey]?.[stepId]
    return value?.status ?? "untested"
  }

  const getStepComment = (sKey: SectionRunKey | undefined, stepId: string): string => {
    if (!sKey) return ""
    return runs[sKey]?.[stepId]?.comment ?? ""
  }

  const setStepStatus = async (sKey: SectionRunKey | undefined, stepId: string, status: StepStatus, comment?: string) => {
    if (!sKey || !project || !module || !section) return
    // optimistic update
    setRuns((prev) => ({
      ...prev,
      [sKey]: {
        ...prev[sKey],
        [stepId]: {
          ...(prev[sKey]?.[stepId] ?? { status: "untested" }),
          status,
          comment: typeof comment === "string" ? comment : prev[sKey]?.[stepId]?.comment,
        },
      },
    }))
    // persist
    try {
      await fetch(`/api/runs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          moduleId: module.id,
          sectionId: section.id,
          stepId,
          status,
          comment,
        }),
      })
    } catch (e) {
      // ignore errors in optimistic skeleton, could rollback here
    }
  }

  const setStepComment = (sKey: SectionRunKey | undefined, stepId: string, comment: string) => {
    if (!sKey) return
    const currentStatus = getStepStatus(sKey, stepId) || "blocked"
    setStepStatus(sKey, stepId, currentStatus, comment)
  }

  const computeSectionStatus = (sec: Section): StepStatus => {
    const key = getSectionKey(project!.id, module!.id, sec.id)
    const statuses = sec.steps.map((st) => runs[key]?.[st.id]?.status ?? "untested")
    if (statuses.length && statuses.every((s) => s === "passed")) return "passed"
    if (statuses.some((s) => s === "failed")) return "failed"
    if (statuses.some((s) => s === "blocked")) return "blocked"
    if (statuses.some((s) => s === "passed")) return "untested" // show as untested if partially done
    return "untested"
  }

  const statusBadge = (status: StepStatus | "in_progress") => {
    const map: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      passed: { text: "PASSED", variant: "default" },
      failed: { text: "FAILED", variant: "destructive" },
      blocked: { text: "BLOCKED", variant: "secondary" },
      in_progress: { text: "IN PROGRESS", variant: "outline" },
      untested: { text: "UNTESTED", variant: "outline" },
    }
    const s = map[status]
    return <Badge variant={s.variant}>{s.text}</Badge>
  }

  const handleSelectProject = (id: string) => {
    const p = projects.find((x) => x.id === id)
    setProjectId(id)
    const firstModule = p?.modules[0]
    setModuleId(firstModule?.id ?? "")
    const firstSection = firstModule?.sections[0]
    setSectionId(firstSection?.id ?? "")
  }

  const handleSelectModule = (id: string) => {
    setModuleId(id)
    const m = project?.modules.find((x) => x.id === id)
    const firstSection = m?.sections[0]
    setSectionId(firstSection?.id ?? "")
  }

  // Module progress (passed steps vs total)
  const moduleProgress = useMemo(() => {
    const mod = module
    if (!project || !mod) return { passed: 0, total: 0, pct: 0 }
    let passed = 0
    let total = 0
    for (const sec of mod.sections) {
      total += sec.steps.length
      const key = getSectionKey(project.id, mod.id, sec.id)
      for (const st of sec.steps) {
        if (getStepStatus(key as SectionRunKey, st.id) === "passed") passed += 1
      }
    }
    const pct = total === 0 ? 0 : Math.round((passed / total) * 100)
    return { passed, total, pct }
  }, [project, module, runs])

  const sortedSteps = (sec: Section) => {
    const arr = [...sec.steps]
    if (stepSort === "desc") arr.reverse()
    return arr
  }

  const q = useMemo(() => search.trim().toLowerCase(), [search])

  const filteredModules = useMemo(() => {
    if (!project) return [] as Module[]
    if (!q) return project.modules
    return project.modules.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true
      for (const s of m.sections) {
        if (s.name.toLowerCase().includes(q)) return true
        for (const st of s.steps) {
          if (
            st.title.toLowerCase().includes(q) ||
            st.description.toLowerCase().includes(q)
          )
            return true
        }
      }
      return false
    })
  }, [project, q])

  const filteredSections = useMemo(() => {
    if (!module) return [] as Section[]
    if (!q) return module.sections
    return module.sections.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true
      for (const st of s.steps) {
        if (
          st.title.toLowerCase().includes(q) ||
          st.description.toLowerCase().includes(q)
        )
          return true
      }
      return false
    })
  }, [module, q])

  // Refresh projects preserving current selection when possible
  const refreshProjectsPreserve = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
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
      })) as Project[]
      setProjects(list)
      if (!list.length) {
        setProjectId(""); setModuleId(""); setSectionId("")
        return
      }
      const pSel = list.find((p) => p.id === projectId) ?? list[0]
      const mSel = pSel.modules.find((m) => m.id === moduleId) ?? pSel.modules[0]
      const sSel = mSel?.sections.find((s) => s.id === sectionId) ?? mSel?.sections[0]
      setProjectId(pSel?.id ?? "")
      setModuleId(mSel?.id ?? "")
      setSectionId(sSel?.id ?? "")
    } catch {}
  }

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64)

  const openDuplicateModule = (mod: Module) => {
    setDupBase(mod)
    setDupName(`${mod.name} Copy`)
    setDupOpen(true)
  }

  const duplicateModule = async () => {
    if (!project || !dupBase) return
    const newName = dupName.trim()
    const newId = slugify(newName)
    if (!newId) return
    // optimistic update
    setProjects((prev) => prev.map((p) => {
      if (p.id !== project.id) return p
      const src = p.modules.find((m) => m.id === dupBase.id)
      if (!src) return p
      const copy: Module = {
        id: newId,
        name: newName,
        sections: src.sections.map((s) => ({ id: s.id, name: s.name, steps: s.steps.map((st) => ({ ...st })) })),
      }
      return { ...p, modules: [...p.modules, copy] }
    }))
    try {
      await fetch('/api/projects/module/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, sourceModuleId: dupBase.id, newModuleId: newId, newName }),
      })
    } finally {
      setDupOpen(false)
      setDupBase(null)
      setDupName("")
      refreshProjectsPreserve()
    }
  }

  const startEdit = (st: TestStep) => {
    setEditingStepId(st.id)
    setEditTitle(st.title)
    setEditDesc(st.description)
  }

  const discardEdit = () => {
    setDiscardOpen(false)
    setEditingStepId(null)
    setEditTitle("")
    setEditDesc("")
  }

  const saveEdit = async () => {
    if (!project || !module || !section || !editingStepId) return
    const payload = {
      projectId: project.id,
      moduleId: module.id,
      sectionId: section.id,
      stepId: editingStepId,
      title: editTitle.trim(),
      description: editDesc.trim(),
    }
    if (!payload.title || !payload.description) return
    try {
      await fetch('/api/projects/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      // Optimistically update local projects tree
      setProjects((prev) => prev.map((p) => {
        if (p.id !== payload.projectId) return p
        return {
          ...p,
          modules: p.modules.map((m) => {
            if (m.id !== payload.moduleId) return m
            return {
              ...m,
              sections: m.sections.map((s) => {
                if (s.id !== payload.sectionId) return s
                return {
                  ...s,
                  steps: s.steps.map((x) => x.id === payload.stepId ? { ...x, title: payload.title, description: payload.description } : x)
                }
              })
            }
          })
        }
      }))
      setEditingStepId(null)
      setEditTitle("")
      setEditDesc("")
    } catch {}
  }

  // old duplicateModule(mod) removed; using openDuplicateModule + duplicateModule()

  const requestDelete = (target: { type: 'module'|'section'|'step'; id: string; name: string }) => {
    setDeleteTarget(target)
    setDeleteOpen(true)
  }

  const performDelete = async () => {
    if (!project || !deleteTarget) return
    try {
      if (deleteTarget.type === 'module') {
        await fetch('/api/projects/module', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, moduleId: deleteTarget.id }),
        })
      } else if (deleteTarget.type === 'section') {
        await fetch('/api/projects/section', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, moduleId: module?.id, sectionId: deleteTarget.id }),
        })
      } else if (deleteTarget.type === 'step') {
        await fetch('/api/projects/step', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, moduleId: module?.id, sectionId: section?.id, stepId: deleteTarget.id }),
        })
      }
      setDeleteOpen(false)
      setDeleteTarget(null)
      await refreshProjectsPreserve()
    } catch {
      setDeleteOpen(false)
      setDeleteTarget(null)
    }
  }

  const quickPassSection = () => {
    if (!project || !module || !section) return
    const key = getSectionKey(project.id, module.id, section.id)
    const beforeAllPassed = section.steps.every((st) => getStepStatus(key, st.id) === "passed")
    setRuns((prev) => ({
      ...prev,
      [key]: section.steps.reduce<Record<string, StepRun>>((acc, st) => {
        acc[st.id] = { ...(prev[key]?.[st.id] ?? { status: "untested" }), status: "passed" }
        return acc
      }, { ...(prev[key] ?? {}) }),
    }))
    // persist in background
    Promise.all(
      section.steps.map((st) =>
        fetch(`/api/runs`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, moduleId: module.id, sectionId: section.id, stepId: st.id, status: 'passed' }),
        }).catch(() => undefined)
      )
    ).catch(() => undefined)
    if (!beforeAllPassed && section.steps.length > 0) {
      setSectionCompleteName(section.name)
      setSectionCompleteOpen(true)
    }
  }

  // Fetch projects initially
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingProjects(true)
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        if (!cancelled) {
          const list = (data?.projects ?? []) as Array<any>
          setProjects(list.map((p) => ({ id: p._id, name: p.name, modules: p.modules?.map((m: any) => ({ id: m._id, name: m.name, sections: m.sections?.map((s: any) => ({ id: s._id, name: s.name, steps: s.steps?.map((st: any) => ({ id: st._id, title: st.title, description: st.description })) || [] })) || [] })) || [] })))
        }
      } finally {
        if (!cancelled) setLoadingProjects(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Initialize selection when projects arrive
  useEffect(() => {
    if (projects.length && !projectId) {
      const p = projects[0]
      const m = p.modules[0]
      const s = m?.sections[0]
      setProjectId(p.id)
      if (m) setModuleId(m.id)
      if (s) setSectionId(s.id)
    }
  }, [projects])

  // Fetch run state for active section
  useEffect(() => {
    const loadRun = async () => {
      if (!project || !module || !section) return
      setLoadingRun(true)
      try {
        const params = new URLSearchParams({ projectId: project.id, moduleId: module.id, sectionId: section.id })
        const res = await fetch(`/api/runs?${params.toString()}`)
        const data = await res.json()
        const key = getSectionKey(project.id, module.id, section.id)
        const stepsObj = (data?.run?.steps ?? {}) as Record<string, StepRun>
        setRuns((prev) => ({ ...prev, [key]: stepsObj }))
      } finally {
        setLoadingRun(false)
      }
    }
    loadRun()
  }, [projectId, moduleId, sectionId])

  // Realtime updates via Pusher
  useEffect(() => {
    let channel: any
    let presence: any
    const subscribe = async () => {
      if (!project || !module || !section) return
      try {
        const { getPusherClient } = await import('@/lib/pusher-client')
        const pusher = getPusherClient()
        const name = `private-section-${project.id}|${module.id}|${section.id}`
        channel = pusher.subscribe(name)
        channel.bind('step-updated', (evt: { stepId: string; status: StepStatus; comment?: string }) => {
          const key = getSectionKey(project.id, module.id, section.id)
          setRuns((prev) => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? {}),
              [evt.stepId]: {
                ...(prev[key]?.[evt.stepId] ?? { status: 'untested' }),
                status: evt.status,
                comment: evt.comment ?? prev[key]?.[evt.stepId]?.comment,
              },
            },
          }))
        })

        // presence channel (viewer count)
        const presenceName = `presence-section-${project.id}|${module.id}|${section.id}`
        presence = pusher.subscribe(presenceName)
        const updateCount = () => {
          try {
            const count = (presence?.members?.count as number) ?? 0
            setViewerCount(count)
          } catch { setViewerCount(0) }
        }
        presence.bind('pusher:subscription_succeeded', updateCount)
        presence.bind('pusher:member_added', updateCount)
        presence.bind('pusher:member_removed', updateCount)
      } catch (e) {
        // Missing NEXT_PUBLIC_PUSHER_* keys or client not available; skip realtime gracefully
        setViewerCount(0)
      }
    }
    subscribe()
    return () => {
      try { if (channel) channel.unsubscribe() } catch {}
      try { if (presence) presence.unsubscribe() } catch {}
    }
  }, [projectId, moduleId, sectionId])

  // Listen for structure updates and refresh tree preserving selection
  useEffect(() => {
    let chan: any
    const run = async () => {
      try {
        const { getPusherClient } = await import('@/lib/pusher-client')
        const p = getPusherClient()
        chan = p.subscribe('presence-tmt')
        chan.bind('structure-updated', () => {
          refreshProjectsPreserve()
        })
      } catch {}
    }
    run()
    return () => { try { if (chan) chan.unsubscribe() } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] w-full p-4 flex flex-col overflow-hidden">
      {/* Top bar: Project selector (left) + Back arrow (right) + live viewers */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full max-w-[720px]">
          <Select value={projectId} onValueChange={handleSelectProject}>
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
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{viewerCount || 0} viewing</span>
          </div>
          <Link href="/" aria-label="Back to home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back</span>
          </Link>
        </div>
      </div>

      {/* Main layout: modules sidebar + sections and steps */}
      <div className="flex gap-6 flex-1 min-h-0 min-w-0">
        {loadingProjects && (
          <div className="text-sm text-muted-foreground">Loading projects…</div>
        )}
        {!loadingProjects && !project && (
          <div className="text-sm text-muted-foreground">No projects</div>
        )}
        {/* Modules sidebar */}
        <aside className="w-[240px] shrink-0 rounded-lg border h-full flex flex-col">
          <div className="border-b px-4 py-3 text-sm font-medium">Modules</div>
            <div className="p-2 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1">
              {filteredModules.map((m) => (
                <div key={m.id} className="relative group">
                    <Button
                      variant={m.id === moduleId ? "default" : "outline"}
                      className="justify-start w-full pr-16"
                      onClick={() => handleSelectModule(m.id)}
                    >
                      {m.name}
                    </Button>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        aria-label="Duplicate module"
                        onClick={() => openDuplicateModule(m)}
                        className="inline-flex p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Duplicate module"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        aria-label="Delete module"
                        onClick={() => requestDelete({ type: 'module', id: m.id, name: m.name })}
                        className="inline-flex p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Delete module"
                      >
                        <Trash className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                  className="absolute left-0 right-0 top-0 h-1.5 rounded-t-lg bg-input/60"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={moduleProgress.total}
                  aria-valuenow={moduleProgress.passed}
                  title={`${moduleProgress.passed}/${moduleProgress.total}`}
                >
                  <div
                    className="h-full rounded-t-lg bg-primary transition-all"
                    style={{ width: `${moduleProgress.pct}%` }}
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="text-xs w-auto py-1 px-2">
                <div className="font-medium">Progress</div>
                <div>{moduleProgress.passed} / {moduleProgress.total} ({moduleProgress.pct}%)</div>
              </HoverCardContent>
            </HoverCard>
            <div className="border-b px-4 py-3 text-sm font-medium">Sections</div>
            <div className="divide-y flex-1 overflow-y-auto">
              {filteredSections.map((sec) => {
                const sStatus = computeSectionStatus(sec)
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSectionId(sec.id)}
                    className={`group w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors ${
                      sec.id === sectionId ? "bg-accent/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{sec.name}</div>
                      <div className="flex items-center gap-2">
                        {statusBadge(sStatus)}
                        <div className="text-xs text-muted-foreground">
                          {sec.steps.filter((st) => getStepStatus(getSectionKey(project!.id, module!.id, sec.id), st.id) === "passed").length}
                          /{sec.steps.length}
                        </div>
                        <button
                          aria-label="Delete section"
                          onClick={(e) => { e.stopPropagation(); requestDelete({ type: 'section', id: sec.id, name: sec.name }) }}
                          className="inline-flex p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete section"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    </div>
                  </button>
                )
              })}
              {!module?.sections?.length && (
                <div className="px-4 py-8 text-sm text-muted-foreground">No sections</div>
              )}
            </div>
          </div>

          {/* Steps panel */}
          <div className="w-1/2 min-w-0 rounded-lg border h-full flex flex-col">
            <div className="border-b px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div className="font-medium">Test Steps</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStepSort((s) => (s === "asc" ? "desc" : "asc"))}
                >
                  {stepSort === "asc" ? (
                    <>
                      <ChevronUp className="size-4" /> Sort: Ascending
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-4" /> Sort: Descending
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={quickPassSection}>
                  Quick pass
                </Button>
              </div>
            </div>
            {!section && (
              <div className="px-4 py-8 text-sm text-muted-foreground">Select a section to view steps</div>
            )}
            {section && (
              <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto">
                {loadingRun && (
                  <div className="text-xs text-muted-foreground">Loading…</div>
                )}
                {(q ? sortedSteps(section).filter((st) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q)) : sortedSteps(section)).map((step, idx) => {
                  const s = getStepStatus(sectionKey, step.id)
                  const displayNum = stepSort === "asc" ? idx + 1 : section.steps.length - idx
                  return (
                    <div key={step.id} className="group relative rounded-md border p-4">
                      {/* Status badge in top-right corner */}
                      <div className="absolute top-2 right-2 pointer-events-none">
                        {statusBadge(s)}
                      </div>

                      <div className="mb-2 flex items-center justify-between gap-3 pr-12">
                        <div className="font-medium">
                          {editingStepId === step.id ? (
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                              placeholder="Step title"
                            />
                          ) : (
                            <>{displayNum}. {step.title}</>
                          )}
                        </div>
                      </div>
                      <div className="mb-3 text-sm text-muted-foreground">
                        {editingStepId === step.id ? (
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            placeholder="Step description"
                          />
                        ) : (
                          <div onDoubleClick={() => startEdit(step)} className="cursor-text">
                            {step.description}
                          </div>
                        )}
                      </div>
                      {editingStepId === step.id && (
                        <div className="mb-3 flex items-center gap-2">
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setDiscardOpen(true)}>Discard</Button>
                        </div>
                      )}
                      {s === "blocked" && (
                        <div className="mb-3">
                          <textarea
                            value={getStepComment(sectionKey, step.id)}
                            onChange={(e) => setStepComment(sectionKey, step.id, e.target.value)}
                            placeholder="Dodaj komentarz do blokady..."
                            className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            rows={3}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant={s === "failed" ? "destructive" : "outline"}
                            onClick={() => setStepStatus(sectionKey, step.id, "failed")}
                          >
                            Failed
                          </Button>
                          <Button
                            variant={s === "blocked" ? "secondary" : "outline"}
                            onClick={() => setStepStatus(sectionKey, step.id, "blocked")}
                          >
                            Blocked
                          </Button>
                          <Button
                            variant={s === "passed" ? "default" : "outline"}
                            onClick={() => {
                              if (section && sectionKey) {
                                const beforeAllPassed = section.steps.every((st) => getStepStatus(sectionKey, st.id) === "passed")
                                const afterAllPassed = section.steps.every((st) =>
                                  st.id === step.id ? true : getStepStatus(sectionKey, st.id) === "passed"
                                )
                                if (!beforeAllPassed && afterAllPassed) {
                                  setSectionCompleteName(section.name)
                                  setSectionCompleteOpen(true)
                                }
                              }
                              setStepStatus(sectionKey, step.id, "passed")
                            }}
                          >
                            Passed
                          </Button>
                          <Button
                            variant={s === "untested" ? "outline" : "outline"}
                            onClick={() => setStepStatus(sectionKey, step.id, "untested")}
                          >
                            Reset
                          </Button>
                        </div>
                        <button
                          aria-label="Delete step"
                          onClick={() => requestDelete({ type: 'step', id: step.id, name: step.title })}
                          className="inline-flex p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete step"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Section Completed Alert */}
      <AlertDialog open={sectionCompleteOpen} onOpenChange={setSectionCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Section Completed</AlertDialogTitle>
          <AlertDialogDescription>
            All test steps in "{sectionCompleteName}" are passed. Great job!
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSectionCompleteOpen(false)}>OK</AlertDialogAction>
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
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>Keep editing</Button>
            <AlertDialogAction onClick={discardEdit}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. It will permanently remove "{deleteTarget?.name}".
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate module dialog */}
      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Duplicate module</AlertDialogTitle>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">New module name</label>
            <input
              value={dupName}
              onChange={(e) => setDupName(e.target.value)}
              className="w-full rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder={`${dupBase?.name ?? ''} Copy`}
            />
            <div className="text-xs text-muted-foreground">ID (slug): {dupName ? dupName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0,64) : ''}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDupOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={duplicateModule}>Duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
