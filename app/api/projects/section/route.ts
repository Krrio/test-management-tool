import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { getPusher } from "@/lib/pusher-server";

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { projectId, moduleId, sectionId } = body || {};
  if (!projectId || !moduleId || !sectionId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const proj: any = await Project.findById(projectId);
  if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const mod = proj.modules.find((m: any) => m._id === moduleId);
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  const before = mod.sections.length;
  mod.sections = mod.sections.filter((s: any) => s._id !== sectionId);
  if (mod.sections.length === before) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  await proj.save();
  try { const p = getPusher(); await p.trigger('presence-tmt', 'structure-updated', { projectId }); } catch {}
  return NextResponse.json({ ok: true });
}

