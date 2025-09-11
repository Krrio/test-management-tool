import { Schema, model, models } from "mongoose";

const StepRunSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["untested", "passed", "failed", "blocked"],
      default: "untested",
    },
    comment: { type: String },
    updatedBy: { type: String },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const RunSchema = new Schema(
  {
    projectId: { type: String, required: true },
    moduleId: { type: String, required: true },
    sectionId: { type: String, required: true },
    steps: { type: Map, of: StepRunSchema, default: {} },
  },
  { timestamps: true }
);

RunSchema.index({ projectId: 1, moduleId: 1, sectionId: 1 }, { unique: true });

export type RunDocument = {
  projectId: string;
  moduleId: string;
  sectionId: string;
  steps: Map<
    string,
    {
      status: "untested" | "passed" | "failed" | "blocked";
      comment?: string;
      updatedBy?: string;
      updatedAt?: Date;
    }
  >;
};

export const Run = models.Run || model<RunDocument>("Run", RunSchema);

