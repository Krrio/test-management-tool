import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { demoProjects } from "@/lib/seed-data";

const DEFAULT_ORG_ID = "demo-org";

function mapForProjectDoc() {
  return demoProjects.map((p) => ({
    _id: p.id,
    organizationId: DEFAULT_ORG_ID,
    name: p.name,
    modules: p.modules.map((m) => ({
      _id: m.id,
      name: m.name,
      sections: m.sections.map((s) => ({
        _id: s.id,
        name: s.name,
        steps: s.steps.map((st) => ({ _id: st.id, title: st.title, description: st.description })),
      })),
    })),
  }));
}

async function main() {
  await connectDB();
  const docs = mapForProjectDoc();
  // ensure organization exists on demand to avoid foreign key issues later
  const { Organization, OrganizationMember } = await import("@/models/Organization");
  await Organization.findOneAndUpdate(
    { _id: DEFAULT_ORG_ID },
    { _id: DEFAULT_ORG_ID, name: "Demo Org", ownerId: "demo-owner" },
    { upsert: true, new: true }
  );
  await OrganizationMember.findOneAndUpdate(
    { organizationId: DEFAULT_ORG_ID, userId: "demo-owner" },
    { organizationId: DEFAULT_ORG_ID, userId: "demo-owner", role: "owner" },
    { upsert: true, new: true }
  );
  for (const doc of docs) {
    await Project.findOneAndUpdate({ _id: doc._id }, doc, { upsert: true, new: true });
  }
}

main()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
