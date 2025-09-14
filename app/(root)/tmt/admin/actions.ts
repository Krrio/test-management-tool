"use server";

import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";

export async function createProject(input: { id: string; name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const id = (input.id || "").trim();
  const name = (input.name || "").trim();
  if (!id || !name) throw new Error("Project id and name are required");
  await connectDB();
  const exists = await Project.findById(id).lean();
  if (exists) throw new Error("Project already exists");
  await Project.create({ _id: id, name, modules: [] });
  return { ok: true } as const;
}

export async function addModule(input: { projectId: string; id: string; name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const { projectId } = input;
  const id = (input.id || "").trim();
  const name = (input.name || "").trim();
  if (!projectId || !id || !name) throw new Error("Missing fields");
  await connectDB();
  const proj = await Project.findById(projectId);
  if (!proj) throw new Error("Project not found");
  if (proj.modules.some((m: any) => m._id === id)) throw new Error("Module exists");
  (proj.modules as any).push({ _id: id, name, sections: [] });
  await proj.save();
  return { ok: true } as const;
}

export async function addSection(input: { projectId: string; moduleId: string; id: string; name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const { projectId, moduleId } = input;
  const id = (input.id || "").trim();
  const name = (input.name || "").trim();
  if (!projectId || !moduleId || !id || !name) throw new Error("Missing fields");
  await connectDB();
  const proj: any = await Project.findById(projectId);
  if (!proj) throw new Error("Project not found");
  const mod = proj.modules.find((m: any) => m._id === moduleId);
  if (!mod) throw new Error("Module not found");
  if (mod.sections.some((s: any) => s._id === id)) throw new Error("Section exists");
  mod.sections.push({ _id: id, name, steps: [] });
  await proj.save();
  return { ok: true } as const;
}

export async function addStep(input: { projectId: string; moduleId: string; sectionId: string; id: string; title: string; description: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const { projectId, moduleId, sectionId } = input;
  const id = (input.id || "").trim();
  const title = (input.title || "").trim();
  const description = (input.description || "").trim();
  if (!projectId || !moduleId || !sectionId || !id || !title || !description) throw new Error("Missing fields");
  await connectDB();
  const proj: any = await Project.findById(projectId);
  if (!proj) throw new Error("Project not found");
  const mod = proj.modules.find((m: any) => m._id === moduleId);
  if (!mod) throw new Error("Module not found");
  const sec = mod.sections.find((s: any) => s._id === sectionId);
  if (!sec) throw new Error("Section not found");
  if (sec.steps.some((st: any) => st._id === id)) throw new Error("Step exists");
  sec.steps.push({ _id: id, title, description });
  await proj.save();
  return { ok: true } as const;
}
