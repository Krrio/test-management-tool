"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type InvitePageProps = {
  params: { token: string };
};

type InviteStatus = "loading" | "success" | "error";

export default function InviteAcceptPage({ params }: InvitePageProps) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [message, setMessage] = useState<string>("Accepting invitation…");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const accept = async () => {
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to accept invitation");
        }
        setStatus("success");
        setMessage("Invitation accepted. Redirecting to TMT…");
        timeout = setTimeout(() => {
          router.push("/tmt");
        }, 1500);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Failed to accept invitation");
      }
    };
    accept();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [token, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "loading" && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Joining workspace</h1>
            <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
              {message}
            </p>
          </div>
          {status === "error" && (
            <Link href="/tmt" className="text-sm text-primary hover:underline">
              Go to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
