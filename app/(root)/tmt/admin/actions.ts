"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ensureOrganizationAccess } from "@/lib/organizations";

type MembershipGuard = {
  organizationId: string;
};

type ProjectIdentifiers = MembershipGuard & { projectId: string };

type ModuleIdentifiers = ProjectIdentifiers & { moduleId: string };

type SectionIdentifiers = ModuleIdentifiers & { sectionId: string };

function assertElevated(role: string) {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function createProject(input: { id: string; name: string; organizationId: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = input.id.trim();
  const name = input.name.trim();
  const organizationId = input.organizationId.trim();
  if (!id || !name || !organizationId) {
    throw new Error("Project id, name and organizationId are required");
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  assertElevated(membership.role);

  await connectDB();
  const exists = await Project.findOne({ _id: id, organizationId }).lean();
  if (exists) throw new Error("Project already exists");

  await Project.create({ _id: id, name, organizationId, modules: [] });
  return { ok: true } as const;
}

export async function addModule(input: { id: string; name: string } & ProjectIdentifiers) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = input.id.trim();
  const name = input.name.trim();
  const { projectId, organizationId } = input;
  if (!id || !name || !projectId || !organizationId) throw new Error("Missing fields");

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  assertElevated(membership.role);

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) throw new Error("Project not found");

  if (project.modules.some((module: { _id: string }) => module._id === id)) {
    throw new Error("Module exists");
  }

  project.modules.push({ _id: id, name, sections: [] });
  await project.save();
  return { ok: true } as const;
}

export async function addSection(input: { id: string; name: string } & ModuleIdentifiers) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = input.id.trim();
  const name = input.name.trim();
  const { projectId, moduleId, organizationId } = input;
  if (!id || !name || !projectId || !moduleId || !organizationId) throw new Error("Missing fields");

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  assertElevated(membership.role);

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) throw new Error("Project not found");

  const targetModule = project.modules.find((item: { _id: string }) => item._id === moduleId);
  if (!targetModule) throw new Error("Module not found");
  if (targetModule.sections.some((section: { _id: string }) => section._id === id)) {
    throw new Error("Section exists");
  }

  targetModule.sections.push({ _id: id, name, steps: [] });
  await project.save();
  return { ok: true } as const;
}

export async function addStep(
  input: { id: string; title: string; description: string; expectedResults?: string } & SectionIdentifiers
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = input.id.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const expectedResults = input.expectedResults?.trim() ?? "";
  const { projectId, moduleId, sectionId, organizationId } = input;
  if (!id || !title || !description || !projectId || !moduleId || !sectionId || !organizationId) {
    throw new Error("Missing fields");
  }

  const membership = await ensureOrganizationAccess(userId, organizationId);
  if (!membership) throw new Error("Forbidden");
  assertElevated(membership.role);

  await connectDB();
  const project = await Project.findOne({ _id: projectId, organizationId });
  if (!project) throw new Error("Project not found");

  const targetModule = project.modules.find((item: { _id: string }) => item._id === moduleId);
  if (!targetModule) throw new Error("Module not found");

  const section = targetModule.sections.find((item: { _id: string }) => item._id === sectionId);
  if (!section) throw new Error("Section not found");
  if (section.steps.some((step: { _id: string }) => step._id === id)) {
    throw new Error("Step exists");
  }

  section.steps.push({ _id: id, title, description, expectedResults });
  await project.save();
  return { ok: true } as const;
}
