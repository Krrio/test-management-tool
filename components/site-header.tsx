"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import Image from "next/image";
import { Badge } from "./ui/badge";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname !== "/" && pathname !== "/pricing") return null;

  return (
    <header className="relative flex items-center h-12 bg-black px-8">
      <div className="flex-1 min-w-0 ">
        <Link href="/" className="font-medium flex-row flex items-center justify-start tracking-tight leading-[1.08]">
          <Image src="/check.svg" alt="logo" width={36} height={36} className="mr-2 font-funky"/>Quarium
        </Link>
      </div>
      {/* <div className="absolute left-1/2 -translate-x-1/2">
        <Header variant="compact" className="w-auto py-0" />
      </div> */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-3">
        <SignedOut>
          <SignInButton>
            <Button variant="outline">Sign In</Button>
          </SignInButton>
          <SignUpButton>
            <Button>Sign Up</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
