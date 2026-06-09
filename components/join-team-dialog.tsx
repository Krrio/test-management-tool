"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

function extractInvitationToken(value: string): string {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    const tokenFromQuery = url.searchParams.get("token")?.trim();
    if (tokenFromQuery) return tokenFromQuery;

    const inviteIndex = url.pathname.split("/").findIndex((part) => part === "invite");
    if (inviteIndex >= 0) {
      return url.pathname.split("/")[inviteIndex + 1]?.trim() ?? "";
    }
  } catch {
    // Treat non-URL input as either a raw token or a copied relative path.
  }

  const inviteMatch = input.match(/\/invite\/([^/?#]+)/);
  if (inviteMatch?.[1]) return inviteMatch[1].trim();

  return input.replace(/^\/+|\/+$/g, "");
}

export function JoinTeamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => extractInvitationToken(inviteValue), [inviteValue]);

  const reset = () => {
    setInviteValue("");
    setError("");
    setSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Paste an invitation link or token.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to join team");
      }

      toast.success("Team joined", {
        description: "You now have access to the workspace.",
        position: "bottom-right",
      });
      setOpen(false);
      reset();
      router.push("/tmt");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to join team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 rounded-full border-white/15 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
      >
        <UserPlus className="size-4" />
        <span className="hidden sm:inline">Join Team</span>
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <AlertDialogTitle>Join Team</AlertDialogTitle>
              <AlertDialogDescription>
                Paste the invitation link you received to join the workspace.
              </AlertDialogDescription>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Invitation link</span>
              <input
                value={inviteValue}
                onChange={(event) => {
                  setInviteValue(event.target.value);
                  if (error) setError("");
                }}
                placeholder="https://quarium.app/invite/..."
                className="rounded-md border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                autoFocus
              />
            </label>

            {error && <div className="text-xs text-destructive">{error}</div>}

            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={submitting || !token}>
                {submitting ?
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Joining...
                  </>
                : "Join Team"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
