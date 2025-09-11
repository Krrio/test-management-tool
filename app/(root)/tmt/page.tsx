"use client"

import React, { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
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

// Demo data (can be fetched later)
const demoProjects: Project[] = [
  {
    id: "mwo",
    name: "MWO",
    modules: [
      {
        id: "monetization",
        name: "Monetization",
        sections: [
          {
            id: "so",
            name: "SO",
            steps: [
              { id: "so-1", title: "Open Store", description: "Open the store from the main menu" },
              { id: "so-2", title: "Load Offers", description: "Verify offers load with correct prices" },
              { id: "so-3", title: "Offer Details", description: "Check details modal opens and content is correct" },
              { id: "so-4", title: "Offer Details Chained", description: "Check details Offer Details Chained" },
              { id: "so-5", title: "Offer Details Test", description: "Check details Offer Details Test" },
            ],
          },
          {
            id: "chest-iap", 
            name: "Chest & IAP",
            steps: [
              { id: "ci-1", title: "Open Chest", description: "Open a free chest and observe rewards" },
              { id: "ci-2", title: "Purchase IAP", description: "Buy a small IAP and verify receipt" },
            ],
          },
          {
            id: "currencies",
            name: "Currencies",
            steps: [
              { id: "cur-1", title: "Balance UI", description: "Balances are shown and update in real-time" },
              { id: "cur-2", title: "Spend", description: "Spending reduces currency as expected" },
              { id: "cur-3", title: "Gain", description: "Gaining increases currency as expected" },
            ],
          },
          {
            id: "buttons",
            name: "Buttons",
            steps: [
              { id: "btn-1", title: "Disabled State", description: "Buttons show disabled state when unavailable" },
              { id: "btn-2", title: "Click Action", description: "Primary actions trigger the correct flow" },
            ],
          },
        ],
      },
      {
        id: "onboarding",
        name: "Onboarding",
        sections: [
          {
            id: "tutorial",
            name: "Tutorial",
            steps: [
              { id: "tut-1", title: "Start Tutorial", description: "Tutorial starts after first launch" },
              { id: "tut-2", title: "Hints", description: "Hints appear contextually and can be dismissed" },
            ],
          },
        ],
      },
    ],
  },
]

type SectionRunKey = `${string}|${string}|${string}` // projectId|moduleId|sectionId

export default function TestCaseLabPage() {
  const [projects] = useState<Project[]>(demoProjects)
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "")
  const [moduleId, setModuleId] = useState<string>(projects[0]?.modules[0]?.id ?? "")
  const [sectionId, setSectionId] = useState<string>(projects[0]?.modules[0]?.sections[0]?.id ?? "")

  // runs: map from sectionKey -> map of stepId -> { status, comment? }
  const [runs, setRuns] = useState<Record<SectionRunKey, Record<string, StepRun>>>({})
  const [sectionCompleteOpen, setSectionCompleteOpen] = useState(false)
  const [sectionCompleteName, setSectionCompleteName] = useState<string | undefined>(undefined)
  const [stepSort, setStepSort] = useState<"asc" | "desc">("asc")

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

  const setStepStatus = (sKey: SectionRunKey | undefined, stepId: string, status: StepStatus) => {
    if (!sKey) return
    setRuns((prev) => ({
      ...prev,
      [sKey]: {
        ...prev[sKey],
        [stepId]: {
          ...(prev[sKey]?.[stepId] ?? { status: "untested" }),
          status,
        },
      },
    }))
  }

  const setStepComment = (sKey: SectionRunKey | undefined, stepId: string, comment: string) => {
    if (!sKey) return
    setRuns((prev) => ({
      ...prev,
      [sKey]: {
        ...prev[sKey],
        [stepId]: {
          ...(prev[sKey]?.[stepId] ?? { status: "blocked" }),
          comment,
        },
      },
    }))
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
    if (!beforeAllPassed && section.steps.length > 0) {
      setSectionCompleteName(section.name)
      setSectionCompleteOpen(true)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full p-4 flex flex-col overflow-hidden">
      {/* Top bar: Project selector (left) + Back arrow (right) */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Select value={projectId} onValueChange={handleSelectProject}>
            <SelectTrigger className="min-w-[220px]">
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
        </div>
        <Link href="/" aria-label="Back to home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back</span>
        </Link>
      </div>

      {/* Main layout: modules sidebar + sections and steps */}
      <div className="flex gap-6 flex-1 min-h-0 min-w-0">
        {/* Modules sidebar */}
        <aside className="w-[240px] shrink-0 rounded-lg border h-full flex flex-col">
          <div className="border-b px-4 py-3 text-sm font-medium">Modules</div>
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1">
              {project?.modules.map((m) => (
                <Button
                  key={m.id}
                  variant={m.id === moduleId ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleSelectModule(m.id)}
                >
                  {m.name}
                </Button>
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
              {module?.sections.map((sec) => {
                const sStatus = computeSectionStatus(sec)
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSectionId(sec.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-accent/30 transition-colors ${
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
                {sortedSteps(section).map((step, idx) => {
                  const s = getStepStatus(sectionKey, step.id)
                  const displayNum = stepSort === "asc" ? idx + 1 : section.steps.length - idx
                  return (
                    <div key={step.id} className="rounded-md border p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="font-medium">{displayNum}. {step.title}</div>
                         {statusBadge(s)}
                      </div>
                      <div className="mb-3 text-sm text-muted-foreground">{step.description}</div>
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
    </div>
  )
}
