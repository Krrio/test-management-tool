import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield, Play, ChevronDown, Circle, CircleDot, ArrowBigRight, ArrowRight } from "lucide-react";
import "@/app/home.css";
import HowTo from "../ui/how-to";
import { InsightsFeatures } from "../ui/insights-component";

const Insights = () => {
  return (
    <main className="relative w-full overflow-hidden font-devis mb-6">
      {/* Main frame (full-bleed) */}
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative h-full max-w-[calc(100%-2rem)] mx-auto bg-black/80 text-white overflow-hidden rounded-[32px] shadow-xl">
          <div
            className="pointer-events-none absolute right-[-40%] top-[-70%] z-0 h-[100%] w-[92%] blur-3xl"
            style={{
              background:
                "radial-gradient(56% 56% at 50% 50%, rgba(180,210,255,0.42), rgba(180,210,255,0.22) 42%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute left-[-48%] top-[-10%] z-0 h-[120%] w-[65%] blur-[120px] opacity-80"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(138,180,255,0.35), rgba(79,140,255,0.18) 45%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute left-[50%] bottom-[-55%] z-0 h-[72%] w-[98%] blur-3xl opacity-80 rotate"
            style={{
              background:
                "radial-gradient(56% 56% at 50% 50%, rgba(180,210,255,0.42), rgba(180,210,255,0.22) 42%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col items-center justify-start mt-10 text-center">
            <h1 className="font-display mb-4 bg-clip-text text-center text-4xl font tracking-tight whitespace-nowrap sm:text-5xl md:text-6xl lg:text-6xl">
              Insights
            </h1>
            <p className="text-gray-300/90">
              Collaborate with Your team and integrate with Your favourite apps.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <Button className="rounded-full px-6 cursor-pointer group" size="lg">
                    How it works?<ArrowRight className="mr-2 size-4 rotate-315 group-hover:translate-x-2 transition-all ease-in-out" />
                  </Button>
              </div>
              <InsightsFeatures />
            </div>

          
        </div>
      </div>
    </main>
  )
}

export default Insights
