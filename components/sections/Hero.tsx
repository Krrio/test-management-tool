import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ChevronRight, Shield, Play, ChevronDown, Circle, CircleDot, ArrowBigRight, ArrowRight, ArrowDown } from "lucide-react";
import "@/app/home.css";

const Hero = () => {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
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

          {/* Corner line overlays (PNG versions) */}
          <img
            src="/Vector%201-2.png"
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute left-0 top-[110px] opacity-80 h-auto w-[200px] sm:w-[280px] md:w-[360px] lg:w-[480px] 2xl:w-[640px] hero-line 2xl:top-[280px]"
          />
          <img
            src="/Vector%201.png"
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute left-0 top-[520px] opacity-80 h-auto w-[200px] sm:w-[280px] md:w-[360px] lg:w-[480px] 2xl:w-[640px] hero-line 2xl:top-[860px]"
          />
          <img
            src="/Vector%201-3.png"
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute right-0 top-[110px] opacity-80 h-auto w-[200px] sm:w-[280px] md:w-[360px] lg:w-[480px] 2xl:w-[640px] hero-line 2xl:top-[280px]"
          />
          <img
            src="/Vector%201-4.png"
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute right-0 top-[520px] opacity-80 h-auto w-[200px] sm:w-[280px] md:w-[360px] lg:w-[480px] 2xl:w-[640px] hero-line 2xl:top-[860px]"
          />

          {/* Top-left logo mark */}
          {/* <div className="absolute left-4 top-4 z-20 hidden sm:block">
            <div className="size-8 rounded-full bg-gradient-to-br from-white/90 to-white/30 flex items-center justify-center shadow-md">
              <div className="size-3 rounded-full bg-black/70" />
            </div>
          </div> */}
          {/* Center content */}
          <section className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center text-center px-6">
            {/* small pill above title */}
            <Link href="/roadmap">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/5 px-3 py-2 text-xs text-white/80 backdrop-blur">
              <span className="inline-flex h-2 w-2 rounded-full bg-white/70 font-funky" /> Changelog
              <ChevronRight className="size-3.5" />
            </div>
            </Link>


            <h1 className="text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.08] font-devis">
              <span className="text-white">Streamline Your</span><br />
              <span className="ml-2 bg-clip-text text-transparent animate-gradient-text">Testing.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/70 font-devis">
              Centralize every test case, plan, and result. Ship with confidence, faster.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <SignedIn>
                <Link href="/tmt">
                  <Button className="rounded-full px-6 cursor-pointer group font-devis" size="lg">
                    Open App<ArrowRight className="mr-2 size-4 rotate-315 group-hover:translate-x-2 transition-all ease-in-out" />
                  </Button>
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in">
                  <Button className="rounded-full px-6 font-devis" size="lg">
                    Let&apos;s start
                  </Button>
                </Link>
              </SignedOut>
              <Link href="/pricing">
                <Button className="rounded-full z-20 px-6 h-[44px] w-[132px] bg-black! border border-white/10 hover:bg-white/10 cursor-pointer font-devis" size="lg" variant="outline">
                  Pricing
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
          {/* Data markers anchored to each line */}
          <div className="pointer-events-none absolute left-[226px] top-[210px] 2xl:top-[420px] hidden md:flex items-center gap-4 text-white/80">
            <div className="rounded-full border">
            <img
              src="/shape-1.png"
              alt=""
              aria-hidden
              className="h-[38px] w-[38px] sm:h-[44px] sm:w-[44px] lg:h-[52px] lg:w-[52px] opacity-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.16)]"
            />
          </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium font-devis">
                <span className="inline-block size-1.5 rounded-full bg-white" /> Test Steps
              </div>
              <span className="pl-4 text-[10px] sm:text-xs text-white/60">20.945</span>
            </div>
          </div>
          <div className="pointer-events-none absolute left-[156px] top-[495px] 2xl:top-[835px]  hidden md:flex items-center gap-4 text-white/80">
          <div className="rounded-full border">
            <img
              src="/shape-2.png"
              alt=""
              aria-hidden
              className="h-[38px] w-[38px] sm:h-[44px] sm:w-[44px] lg:h-[52px] lg:w-[52px] opacity-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.16)]"
            />
          </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium font-devis">
                <span className="inline-block size-1.5 rounded-full bg-white" /> Sections
              </div>
              <span className="pl-4 text-[10px] sm:text-xs text-white/60">19.346</span>
            </div>
          </div>
          <div className="pointer-events-none absolute right-[176px] top-[210px] 2xl:top-[420px] hidden md:flex items-center gap-4 text-white/80">
            <div className="rounded-full border">
            <img
              src="/shape-3.png"
              alt=""
              aria-hidden
              className="h-[38px] w-[38px] sm:h-[44px] sm:w-[44px] lg:h-[52px] lg:w-[52px] opacity-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.16)]"
            />
          </div>
            <div className="flex flex-col text-right leading-tight">
              <div className="flex items-center justify-end gap-2 text-xs sm:text-sm font-medium font-devis">
                Projects <span className="inline-block size-1.5 rounded-full bg-white" />
              </div>
              <span className="pr-4 text-[10px] sm:text-xs text-white/60">2,077</span>
            </div>
          </div>
          <div className="pointer-events-none absolute right-[86px] top-[495px] 2xl:top-[835px]  hidden md:flex items-center gap-4 text-white/80">
            <div className="rounded-full border">
            <img
              src="/shape-4.png"
              alt=""
              aria-hidden
              className="h-[38px] w-[38px] sm:h-[44px] sm:w-[44px] lg:h-[52px] lg:w-[52px] opacity-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.16)]"
            />
          </div>
            <div className="flex flex-col text-right leading-tight">
              <div className="flex items-center justify-end gap-2 text-xs sm:text-sm font-medium font-devis">
                Modules <span className="inline-block size-1.5 rounded-full bg-white" />
              </div>
              <span className="pr-4 text-[10px] sm:text-xs text-white/60">440</span>
            </div>
          </div>
          {/* Scroll hint bottom-left */}
          <div className="absolute left-4 bottom-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur space-x-2">
              <span className="h-[16px]">v1.0</span>
              <span className="h-[16px] flex flex-row items-center justify-center">Scroll down <ArrowDown className="scale-50"/></span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Hero
