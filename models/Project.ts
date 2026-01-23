import { Schema, model, models } from "mongoose";

const StepSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    expectedResults: { type: String, default: "" },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    steps: { type: [StepSchema], default: [] },
  },
  { _id: false }
);

const ModuleSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    sections: { type: [SectionSchema], default: [] },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    modules: { type: [ModuleSchema], default: [] },
  },
  { timestamps: true }
);

export type ProjectDocument = {
  _id: string;
  organizationId: string;
  name: string;
  modules: Array<{
    _id: string;
    name: string;
    sections: Array<{
      _id: string;
      name: string;
      steps: Array<{
        _id: string;
        title: string;
        description: string;
        expectedResults?: string;
      }>;
    }>;
  }>;
};

export const Project = models.Project || model<ProjectDocument>("Project", ProjectSchema);
