import { connectDB } from "./db";
import {
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationRole,
} from "@/models/Organization";

export type UserOrganization = {
  id: string;
  name: string;
  role: OrganizationRole;
};

export async function listOrganizationsForUser(userId: string) {
  await connectDB();
  const memberships = await OrganizationMember.find({ userId }).lean();
  if (!memberships.length) return [] as UserOrganization[];

  const organizations = await Organization.find({ _id: { $in: memberships.map((m) => m.organizationId) } })
    .select({ _id: 1, name: 1, ownerId: 1 })
    .lean();

  return organizations.map((org) => {
    const membership = memberships.find((m) => m.organizationId === org._id);
    const role = membership?.role ?? (org.ownerId === userId ? "owner" : "member");
    return { id: org._id, name: org.name, role } satisfies UserOrganization;
  });
}

export async function ensureOrganizationAccess(userId: string, organizationId: string) {
  await connectDB();
  const membership = await OrganizationMember.findOne({ organizationId, userId }).lean();
  return membership;
}

export async function createOrganization({
  id,
  name,
  ownerId,
}: {
  id: string;
  name: string;
  ownerId: string;
}) {
  await connectDB();
  const exists = await Organization.findById(id).lean();
  if (exists) throw new Error("Organization already exists");

  await Organization.create({ _id: id, name, ownerId });
  await OrganizationMember.create({ organizationId: id, userId: ownerId, role: "owner" });

  return { id };
}

export async function createInvitationToken({
  organizationId,
  invitedBy,
  email,
  projectId,
  token,
  expiresAt,
}: {
  organizationId: string;
  invitedBy: string;
  email?: string;
  projectId?: string;
  token: string;
  expiresAt: Date;
}) {
  await connectDB();
  await OrganizationInvitation.create({ organizationId, invitedBy, email, projectId, token, expiresAt });
  return { token };
}

export async function consumeInvitationToken({
  token,
  userId,
}: {
  token: string;
  userId: string;
}) {
  await connectDB();
  const invite = await OrganizationInvitation.findOne({ token }).lean();
  if (!invite) throw new Error("Invitation not found");
  if (invite.expiresAt < new Date()) throw new Error("Invitation expired");

  const membership = await OrganizationMember.findOne({ organizationId: invite.organizationId, userId }).lean();
  if (!membership) {
    await OrganizationMember.create({ organizationId: invite.organizationId, userId, role: "member" });
  }

  await OrganizationInvitation.deleteOne({ token });
  return { organizationId: invite.organizationId, projectId: invite.projectId };
}

