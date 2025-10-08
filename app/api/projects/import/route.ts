import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { connectDB } from "@/lib/db";
import { parseExcel, detectExcelFormat } from "@/lib/excel";
import { Project } from "@/models/Project";
import { ensureOrganizationAccess } from "@/lib/organizations";

export const runtime = "nodejs";

function ensureString(value: string | undefined, field: string, errors: string[], rowNumber: number) {
  if (!value || !value.trim()) {
    errors.push(`Row ${rowNumber}: ${field} is required`);
  }
}

type StepPayload = { _id: string; title: string; description: string };
type SectionPayload = { _id: string; name: string; steps: StepPayload[]; stepSet: Set<string> };
type ModulePayload = { _id: string; name: string; sections: SectionPayload[]; sectionMap: Map<string, SectionPayload> };
type ProjectPayload = {
  _id: string;
  name: string;
  modules: ModulePayload[];
  moduleMap: Map<string, ModulePayload>;
};

type Aggregated = {
  docs: Array<{ _id: string; name: string; modules: Array<{ _id: string; name: string; sections: Array<{ _id: string; name: string; steps: StepPayload[] }> }> }>;
  processedRows: number;
};

function aggregateRows(rows: ReturnType<typeof parseExcel>): Aggregated {
  const errors: string[] = [];
  const projects = new Map<string, ProjectPayload>();
  let processedRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // account for header row
    const projectId = row.projectId?.trim();
    const projectName = row.projectName?.trim();
    const moduleId = row.moduleId?.trim();
    const moduleName = row.moduleName?.trim();
    const sectionId = row.sectionId?.trim();
    const sectionName = row.sectionName?.trim();
    const stepId = row.stepId?.trim();
    const stepTitle = row.stepTitle?.trim();
    const stepDescription = row.stepDescription?.trim();

    ensureString(projectId, "projectId", errors, rowNumber);
    ensureString(projectName, "projectName", errors, rowNumber);
    ensureString(moduleId, "moduleId", errors, rowNumber);
    ensureString(moduleName, "moduleName", errors, rowNumber);
    ensureString(sectionId, "sectionId", errors, rowNumber);
    ensureString(sectionName, "sectionName", errors, rowNumber);
    ensureString(stepId, "stepId", errors, rowNumber);
    ensureString(stepTitle, "stepTitle", errors, rowNumber);
    ensureString(stepDescription, "stepDescription", errors, rowNumber);

    if (errors.length) {
      return;
    }

    let project = projects.get(projectId!);
    if (!project) {
      project = { _id: projectId!, name: projectName!, modules: [], moduleMap: new Map() };
      projects.set(projectId!, project);
    } else if (!project.name && projectName) {
      project.name = projectName;
    }

    let modulePayload = project.moduleMap.get(moduleId!);
    if (!modulePayload) {
      modulePayload = { _id: moduleId!, name: moduleName!, sections: [], sectionMap: new Map() };
      project.moduleMap.set(moduleId!, modulePayload);
      project.modules.push(modulePayload);
    }

    let section = modulePayload.sectionMap.get(sectionId!);
    if (!section) {
      section = { _id: sectionId!, name: sectionName!, steps: [], stepSet: new Set() };
      modulePayload.sectionMap.set(sectionId!, section);
      modulePayload.sections.push(section);
    }

    if (!section.stepSet.has(stepId!)) {
      section.stepSet.add(stepId!);
      section.steps.push({ _id: stepId!, title: stepTitle!, description: stepDescription! });
      processedRows += 1;
    }
  });

  if (errors.length) {
    const error = errors.slice(0, 5).join("; ");
    throw new Error(error);
  }

  const docs = Array.from(projects.values()).map((project) => ({
    _id: project._id,
    name: project.name,
    modules: project.modules.map((module) => ({
      _id: module._id,
      name: module.name,
      sections: module.sections.map((section) => ({
        _id: section._id,
        name: section.name,
        steps: section.steps.map((step) => ({
          _id: step._id,
          title: step.title,
          description: step.description,
        })),
      })),
    })),
  }));

  return { docs, processedRows };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const organizationId = String(formData.get("organizationId") || "").trim();
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Expected file field named 'file'" }, { status: 400 });
  }
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let rows;
  try {
    rows = parseExcel(buffer);
  } catch (error) {
    const format = detectExcelFormat(buffer);
    const message = error instanceof Error ? error.message : "Failed to parse file";
    return NextResponse.json(
      { error: `Unable to parse ${format.toUpperCase()} file: ${message}` },
      { status: 400 }
    );
  }

  if (!rows.length) {
    return NextResponse.json({ error: "The spreadsheet is empty" }, { status: 400 });
  }

  let aggregated: Aggregated;
  try {
    aggregated = aggregateRows(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid data";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!aggregated.docs.length) {
    return NextResponse.json({ error: "No valid rows found in the sheet" }, { status: 400 });
  }

  await connectDB();

  for (const doc of aggregated.docs) {
    await Project.findOneAndUpdate(
      { _id: doc._id, organizationId },
      { ...doc, organizationId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return NextResponse.json({
    ok: true,
    stats: {
      projects: aggregated.docs.length,
      rows: aggregated.processedRows,
    },
  });
}
