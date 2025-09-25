import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield, Play, ChevronDown, Circle, CircleDot, ArrowBigRight, ArrowRight } from "lucide-react";
import "@/app/home.css";

const Insights = () => {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Main frame (full-bleed) */}
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative h-full max-w-[calc(100%-2rem)] mx-auto bg-black/80 text-white overflow-hidden rounded-[32px] shadow-xl border">
          <div className="flex h-full flex-col items-center justify-start mt-10 text-center">
            <h1 className="font-display mb-4 bg-clip-text text-center text-4xl font-bold tracking-tight whitespace-nowrap sm:text-5xl md:text-6xl lg:text-6xl">
              DeFi Wallet
            </h1>
            <p className="text-gray-300/90">
              Save Your team's time and effort with our comprehensive test management tool.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <SignedIn>
                <Link href="/tmt">
                  <Button className="rounded-full px-6 cursor-pointer group" size="lg">
                    How it works?<ArrowRight className="mr-2 size-4 rotate-315 group-hover:translate-x-2 transition-all ease-in-out" />
                  </Button>
                </Link>
              </SignedIn>
              </div>
            </div>

          
        </div>
      </div>
    </main>
  )
}

export default Insights