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
  const { projectId, moduleId } = body || {};
  if (!projectId || !moduleId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const proj: any = await Project.findById(projectId);
  if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const before = proj.modules.length;
  proj.modules = proj.modules.filter((m: any) => m._id !== moduleId);
  if (proj.modules.length === before) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  await proj.save();
  try { const p = getPusher(); await p.trigger('presence-tmt', 'structure-updated', { projectId }); } catch {}
  return NextResponse.json({ ok: true });
}

