import { connectDB } from "./db";
import { Notification, NotificationDocument, NotificationType } from "@/models/Notification";
import { getPusher } from "./pusher-server";

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  organizationId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  organizationId?: string;
  actorId?: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type StoredNotification = NotificationDocument & {
  _id: unknown;
  metadata?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt?: Date;
};

function serializeNotification(doc: StoredNotification): NotificationRecord {
  const readAtDate = doc.readAt instanceof Date ? doc.readAt : doc.readAt ? new Date(doc.readAt) : null;
  const createdAtDate =
    doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt ? new Date(doc.createdAt) : new Date();
  return {
    id: String((doc as { _id: unknown })._id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    organizationId: doc.organizationId ?? undefined,
    actorId: doc.actorId ?? undefined,
    metadata: (doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}) as Record<string, unknown>,
    readAt: readAtDate ? readAtDate.toISOString() : null,
    createdAt: createdAtDate.toISOString(),
  };
}

export async function createNotification(input: NotificationInput): Promise<NotificationRecord> {
  await connectDB();
  const doc = await Notification.create({
    ...input,
    metadata: input.metadata ?? {},
  });
  const plain = serializeNotification(doc.toObject() as StoredNotification);
  try {
    const pusher = getPusher();
    await pusher.trigger(`private-notifications-${input.userId}`, "notification-created", plain);
  } catch {}
  return plain;
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRecord[]> {
  await connectDB();
  const docs = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<StoredNotification[]>();
  return docs.map(serializeNotification);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  await connectDB();
  const filter: Record<string, unknown> = { userId, readAt: null };
  if (Array.isArray(ids) && ids.length > 0) {
    filter._id = { $in: ids };
  }
  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return result.modifiedCount ?? 0;
}
