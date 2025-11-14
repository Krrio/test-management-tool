import { Schema, model, models } from "mongoose";

export type NotificationType = "organization_joined" | "organization_member_joined";

export type NotificationDocument = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  organizationId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["organization_joined", "organization_member_joined"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    organizationId: { type: String },
    actorId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification =
  models.Notification || model<NotificationDocument>("Notification", NotificationSchema);
