import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { demoProjects } from "@/lib/seed-data";

function mapForProjectDoc() {
  return demoProjects.map((p) => ({
    _id: p.id,
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

