import { Schema, model, models } from "mongoose";

export type OrganizationRole = "owner" | "admin" | "member";

const OrganizationSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true },
  },
  { timestamps: true }
);

const OrganizationMemberSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
  },
  { timestamps: true }
);

OrganizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

const OrganizationInvitationSchema = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    email: { type: String },
    projectId: { type: String },
  },
  { timestamps: true }
);

const OrganizationJiraConfigSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    baseUrl: { type: String, default: "" },
    email: { type: String, default: "" },
    projectKey: { type: String, default: "" },
    issueType: { type: String, default: "Task" },
    apiToken: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export type OrganizationDocument = {
  _id: string;
  name: string;
  ownerId: string;
};

export type OrganizationMemberDocument = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
};

export type OrganizationInvitationDocument = {
  organizationId: string;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  email?: string;
  projectId?: string;
};

export type OrganizationJiraConfigDocument = {
  organizationId: string;
  enabled: boolean;
  baseUrl?: string;
  email?: string;
  projectKey?: string;
  issueType?: string;
  apiToken?: string | null;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export const Organization = models.Organization || model<OrganizationDocument>("Organization", OrganizationSchema);
export const OrganizationMember =
  models.OrganizationMember || model<OrganizationMemberDocument>("OrganizationMember", OrganizationMemberSchema);
export const OrganizationInvitation =
  models.OrganizationInvitation ||
  model<OrganizationInvitationDocument>("OrganizationInvitation", OrganizationInvitationSchema);
export const OrganizationJiraConfig =
  models.OrganizationJiraConfig ||
  model<OrganizationJiraConfigDocument>("OrganizationJiraConfig", OrganizationJiraConfigSchema);
