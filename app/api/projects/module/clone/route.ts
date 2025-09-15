import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { getPusher } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { projectId, sourceModuleId, newModuleId, newName } = body || {};
  if (!projectId || !sourceModuleId || !newModuleId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const proj: any = await Project.findById(projectId);
  if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (proj.modules.some((m: any) => m._id === newModuleId)) return NextResponse.json({ error: "Target module exists" }, { status: 409 });
  const src = proj.modules.find((m: any) => m._id === sourceModuleId);
  if (!src) return NextResponse.json({ error: "Source module not found" }, { status: 404 });
  const copy = JSON.parse(JSON.stringify(src));
  copy._id = newModuleId;
  if (newName && String(newName).trim()) copy.name = String(newName).trim();
  proj.modules.push(copy);
  await proj.save();
  try { const p = getPusher(); await p.trigger('presence-tmt', 'structure-updated', { projectId }); } catch {}
  return NextResponse.json({ ok: true });
}

