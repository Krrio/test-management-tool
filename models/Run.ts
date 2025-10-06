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
    jiraIssue: {
      key: { type: String },
      id: { type: String },
      url: { type: String },
      createdAt: { type: Date },
      createdBy: { type: String },
    },
  },
  { _id: false }
);

const RunSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    moduleId: { type: String, required: true },
    sectionId: { type: String, required: true },
    steps: { type: Map, of: StepRunSchema, default: {} },
  },
  { timestamps: true }
);

RunSchema.index({ organizationId: 1, projectId: 1, moduleId: 1, sectionId: 1 }, { unique: true });

export type RunDocument = {
  organizationId: string;
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
      jiraIssue?: {
        key: string;
        id?: string;
        url?: string;
        createdAt?: Date;
        createdBy?: string;
      };
    }
  >;
};

export const Run = models.Run || model<RunDocument>("Run", RunSchema);
