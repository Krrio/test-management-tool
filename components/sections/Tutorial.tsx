"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SplitText from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "../ui/button";
import { ArrowDown } from "lucide-react";

gsap.registerPlugin(SplitText, ScrollTrigger);

const Tutorial = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !textRef.current) return;

    // Podział na słowa
    const split = new SplitText(textRef.current, { type: "words" });
    const words = split.words as HTMLElement[];
    const steps = Math.max(words.length, 1);
    const snapTo = 1 / steps;

    // Startowy kolor (Tailwind gray-400)
    gsap.set(words, { color: "#191919" });

    // Timeline: zmiana koloru słowo po słowie (czas = liczba słów, brak easing)
    const tl = gsap.timeline({ paused: true, ease: "none" });
    // Jednoczesne kluczowanie czasu: każdemu słowu dajemy „slot” 1s, całość = steps
    tl.to(
      words,
      {
        color: "#ffffff",
        duration: steps,      // całkowity czas = liczba słów
        ease: "none",
        stagger: {
          each: 1,           // co 1 jednostkę czasu kolejne słowo
          ease: "none",
        },
      },
      0
    );

    // ScrollTrigger: pin, scrub i snap do każdego słowa
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: () => `+=${Math.max(steps * 40, window.innerHeight)}`, // długość „trasy” (40px/word)
      pin: true,              // przypnij sekcję
      anticipatePin: 1,
      scrub: true,            // przewijanie steruje czasem timeline (kierunek = kierunek scrolla)
      animation: tl,          // ScrollTrigger zarządza timeline
      snap: {
        snapTo: (value) => Math.round(value / snapTo) * snapTo, // zaskok co słowo
        duration: 0.15,
        ease: "none",
      },
      // markers: true, // odkomentuj do debugowania
    });

    return () => {
      st.kill();
      tl.kill();
      split.revert();
    };
  }, []);

  return (
    <main className="relative w-full font-devis mb-6">
      <section ref={sectionRef} className="relative z-10 bg-black">
        <div className="relative mx-auto max-w-[calc(100%-2rem)] h-screen overflow-hidden rounded-[32px] bg-black/80 text-white shadow-xl">
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
          <div className="h-full w-full flex-col flex items-center justify-center p-8 max-w-7xl mx-auto">
            <p
              ref={textRef}
              className="text-center text-2xl md:text-4xl text-gray-400 font-devis"
            >
              Map your QA rituals into a living workflow that responds to every deploy, highlights risk before it grows, and keeps contributors in sync without leaving their favorite tools.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <Button className="rounded-full px-6 cursor-pointer group" size="lg">
                    Learn more<ArrowDown className="mr-2 size-4 group-hover:translate-y-2 transition-all ease-in-out" />
                  </Button>
              </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Tutorial;
