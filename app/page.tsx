import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import PixelBlast from "@/components/PixelBlast";

export default function Home() {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Tło */}
      <div className="absolute inset-0 z-0">
        <PixelBlast
          className="w-full h-full pointer-events-none"
          variant="diamond"
          pixelSize={3}
          color="#B19EEF"
          patternScale={2}
          patternDensity={1}
          enableRipples={false}
          transparent
          edgeFade={0.35}
          speed={0.45}
        />
      </div>

      {/* Treść */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center justify-center">
        <section className="text-center mx-auto max-w-3xl w-full">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6">
            Test cases, synchronized like magic.
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mb-10">
            Real‑time collaboration, clear steps, and complete quality control.
          </p>

          <div className="flex justify-center">
            <SignedIn>
              <Link href="/tmt">
                <Button size="lg" className="cursor-pointer">Let's start</Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Button size="lg" disabled>
                Let's start
              </Button>
            </SignedOut>
          </div>
        </section>
      </div>
    </main>
  );
}
