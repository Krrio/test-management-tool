import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield, Play, ChevronDown, Circle, CircleDot } from "lucide-react";
import "./home.css";

export default function Home() {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden mb-4">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_60%_20%,rgba(180,200,210,0.2),transparent),radial-gradient(700px_400px_at_20%_80%,rgba(160,200,255,0.12),transparent)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>

      {/* Main frame (full-bleed) */}
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative h-full max-w-[calc(100%-2rem)] mx-auto bg-black/80 text-white overflow-hidden rounded-[32px] shadow-xl">
          {/* In-frame light accents: top-right large soft glow + bottom-left blob */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* top-right elliptical glow (matches reference smear) */}
            <div
              className="absolute right-[-10%] top-[-18%] h-[160%] w-[72%] blur-3xl"
              style={{
                background:
                  "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
              }}
            />
            {/* subtle edge reinforcement to mimic corner highlight */}
            <div
              className="absolute right-[-6%] top-[-8%] h-[120%] w-[50%] blur-[40px] opacity-45"
              style={{
                background:
                  "radial-gradient(55% 60% at 100% 0%, rgba(255,255,255,0.7), rgba(0,0,0,0) 60%)",
              }}
            />
            {/* bottom-left small blob */}
            <div
              className="absolute left-[-14%] bottom-[-16%] h-[58%] w-[52%] blur-2xl"
              style={{
                background:
                  "radial-gradient(56% 56% at 50% 50%, rgba(180,210,255,0.42), rgba(180,210,255,0.22) 42%, rgba(0,0,0,0) 70%)",
              }}
            />
          </div>

          {/* Corner lines like reference (thin, horizontal then smooth corner) */}
          <svg
            className="pointer-events-none absolute inset-0 opacity-60"
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" filter="url(#glow)">
              {/* LEFT side (shorter, raised by 100px) */}
              <g>
                {/* upper */}
                <path d="M0 100 H 240 C 360 100 420 120 500 160 S 620 200 680 220" strokeOpacity="0.22" />
                <circle cx="240" cy="100" r="14" strokeOpacity="0.35" />
                <circle cx="240" cy="100" r="6" strokeOpacity="0.18" />
                {/* lower */}
                <path d="M0 600 H 240 C 360 600 440 580 500 540 S 620 500 680 500" strokeOpacity="0.22" />
                <circle cx="240" cy="600" r="14" strokeOpacity="0.35" />
                <circle cx="240" cy="600" r="6" strokeOpacity="0.18" />
              </g>

                            {/* RIGHT side = mirror of left around vertical center */}
              <g transform="translate(1440,0) scale(-1,1)">
                <path d="M0 100 H 240 C 360 100 420 120 500 160 S 620 200 680 220" strokeOpacity="0.22" />
                <circle cx="240" cy="100" r="14" strokeOpacity="0.35" />
                <circle cx="240" cy="100" r="6" strokeOpacity="0.18" />

                <path d="M0 600 H 240 C 360 600 440 580 500 540 S 620 500 680 500" strokeOpacity="0.22" />
                <circle cx="240" cy="600" r="14" strokeOpacity="0.35" />
                <circle cx="240" cy="600" r="6" strokeOpacity="0.18" />
              </g>
            </g>
          </svg>

          {/* Top-left logo mark */}
          {/* <div className="absolute left-4 top-4 z-20 hidden sm:block">
            <div className="size-8 rounded-full bg-gradient-to-br from-white/90 to-white/30 flex items-center justify-center shadow-md">
              <div className="size-3 rounded-full bg-black/70" />
            </div>
          </div> */}
          {/* Center content */}
          <section className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center text-center px-6">
            {/* small pill above title */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur">
              <span className="inline-flex h-2 w-2 rounded-full bg-white/70" /> Unlock full potential
              <ChevronRight className="size-3.5" />
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08]">
              <span className="text-white">Streamline Your</span><br />
              <span className="ml-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Testing.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/70">
              Centralize every test case, plan, and result. Ship with confidence, faster.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <SignedIn>
                <Link href="/tmt">
                  <Button className="rounded-full px-6" size="lg">
                    <Play className="mr-2 size-4" /> Open App
                  </Button>
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in">
                  <Button className="rounded-full px-6" size="lg">
                    Let's start
                  </Button>
                </Link>
              </SignedOut>
              <Link href="#discover">
                <Button className="rounded-full px-6 h-[44px] w-[132px]! bg-black!" size="lg" variant="outline">
                  Docs
                </Button>
              </Link>
            </div>
          </section>

          {/* Vertical light lines (animated flow) */}
          <div className="pointer-events-none absolute left-1/2 top-[85%] -translate-x-1/2 h-[22%] w-px">
            <span className="block w-px h-[180%] bg-gradient-to-b from-transparent via-white/60 to-transparent line-flow" style={{ animationDelay: "0s" }} />
          </div>
          <div className="pointer-events-none absolute left-[calc(50%+24px)] top-[68%] h-[34%] w-px overflow-hidden">
            <span className="block w-px h-[180%] bg-gradient-to-b from-transparent via-white/40 to-transparent line-flow" style={{ animationDelay: "0.6s" }} />
          </div>
          <div className="pointer-events-none absolute left-[calc(50%-24px)] top-[68%] h-[30%] w-px overflow-hidden">
            <span className="block w-px h-[180%] bg-gradient-to-b from-transparent via-white/30 to-transparent line-flow" style={{ animationDelay: "1.2s" }} />
          </div>
          {/* Data labels near line nodes */}
          <div className="pointer-events-none absolute left-[260px] top-[120px] hidden lg:block text-white/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block size-1.5 rounded-full bg-white" />
              <span className="tracking-tight">Test cases</span>
            </div>
            <div className="ml-5 text-[10px] text-white/60">2,137</div>
          </div>
          <div className="pointer-events-none absolute left-[260px] top-[620px] hidden lg:block text-white/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block size-1.5 rounded-full bg-white" />
              <span className="tracking-tight">Steps</span>
            </div>
            <div className="ml-5 text-[10px] text-white/60">982</div>
          </div>
          {/* Right side labels near right markers */}
          <div className="pointer-events-none absolute right-[260px] top-[120px] hidden lg:block text-right text-white/80">
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="tracking-tight">Projects</span>
              <span className="inline-block size-1.5 rounded-full bg-white" />
            </div>
            <div className="mr-5 text-[10px] text-white/60">2,077</div>
          </div>
          <div className="pointer-events-none absolute right-[260px] top-[620px] hidden lg:block text-right text-white/80">
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="tracking-tight">Modules</span>
              <span className="inline-block size-1.5 rounded-full bg-white" />
            </div>
            <div className="mr-5 text-[10px] text-white/60">440</div>
          </div>
          {/* Scroll hint bottom-left */}
          <div className="absolute left-4 bottom-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <span className="h-[16px]">v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
