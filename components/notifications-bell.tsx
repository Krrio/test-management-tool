"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { useUser } from "@clerk/nextjs";

import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  organizationId?: string;
  actorId?: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type NullableNotification = NotificationItem | null;

function normalizeNotification(value: unknown): NullableNotification {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  const body = typeof raw.body === "string" ? raw.body : null;
  const type = typeof raw.type === "string" ? raw.type : "notification";
  if (!id || !title || !body) return null;
  const createdAtValue = typeof raw.createdAt === "string" ? raw.createdAt : null;
  const readAtValue = typeof raw.readAt === "string" ? raw.readAt : null;
  const organizationId = typeof raw.organizationId === "string" ? raw.organizationId : undefined;
  const actorId = typeof raw.actorId === "string" ? raw.actorId : undefined;
  const metadata =
    raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
  return {
    id,
    title,
    body,
    type,
    organizationId,
    actorId,
    metadata,
    readAt: readAtValue,
    createdAt: createdAtValue ?? new Date().toISOString(),
  };
}

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff) || diff < 0) return "now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function NotificationsBell() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load notifications");
        }
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data?.notifications)
          ? (data.notifications.map(normalizeNotification).filter(Boolean) as NotificationItem[])
          : [];
        setNotifications(items);
      } catch {
        if (active) setNotifications([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!open || unreadCount === 0 || markingRead || !user?.id) return;
    let active = true;
    const mark = async () => {
      setMarkingRead(true);
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to update notifications");
        }
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data?.notifications)
          ? (data.notifications.map(normalizeNotification).filter(Boolean) as NotificationItem[])
          : [];
        setNotifications(items);
      } catch {
        // ignore errors
      } finally {
        if (active) setMarkingRead(false);
      }
    };
    mark();
    return () => {
      active = false;
    };
  }, [open, unreadCount, markingRead, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let channel: Channel | null = null;
    let pusherInstance: Pusher | null = null;
    let cancelled = false;
    const subscribe = async () => {
      try {
        const { getPusherClient } = await import("@/lib/pusher-client");
        if (cancelled) return;
        const client = getPusherClient();
        const name = `private-notifications-${user.id}`;
        channel = client.subscribe(name);
        pusherInstance = client;
        channel.bind("notification-created", (payload: unknown) => {
          const item = normalizeNotification(payload);
          if (!item) return;
          setNotifications((prev) => {
            const withoutDuplicate = prev.filter((notification) => notification.id !== item.id);
            return [item, ...withoutDuplicate].slice(0, 20);
          });
        });
      } catch {
        // ignore subscribe errors
      }
    };
    subscribe();
    return () => {
      cancelled = true;
      if (channel && pusherInstance) {
        channel.unbind_all();
        pusherInstance.unsubscribe(channel.name);
      }
    };
  }, [user?.id]);

  const toggle = () => {
    if (!isLoaded || !user?.id) return;
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label={unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell className={cn("size-5", unreadCount > 0 ? "text-primary" : "text-muted-foreground")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1 h-5 min-w-[1.25rem] rounded-full bg-primary px-1 text-[11px] font-semibold leading-5 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {(loading || markingRead) && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">You are all caught up.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 text-sm transition-colors",
                    notification.readAt ? "hover:bg-muted/30" : "bg-muted/40 hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{notification.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{notification.body}</div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
