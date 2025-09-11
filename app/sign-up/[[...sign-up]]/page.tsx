import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="rounded-lg border bg-card text-card-foreground p-4 sm:p-6 shadow-sm">
        <SignUp signInUrl="/sign-in" />
      </div>
    </div>
  );
}

