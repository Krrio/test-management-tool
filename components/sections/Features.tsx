import "@/app/home.css";
import RotatingEarth from "../ui/wireframe-dotted-globe";
import { ArrowRight, Info } from "lucide-react";
import { Marquee } from "../ui/marquee";
import Image from "next/image";
import { BookmarkIcon, CheckAllIcon, LinkIcon, TagIcon } from "@/public/svgs";

const Features = () => {
  return (
    <main className="relative w-full overflow-hidden mb-20">
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative h-full max-w-[calc(100%-2rem)] mx-auto bg-black/85 text-white overflow-hidden rounded-[32px] shadow-2xl">
          {/* <div
            className="absolute right-[-20%] top-[-40%] h-[120%] w-[52%] blur-3xl"
            style={{
              background:
                "radial-gradient(56% 56% at 50% 50%, rgba(180,210,255,0.42), rgba(180,210,255,0.22) 42%, rgba(0,0,0,0) 70%)",
            }}
          />
          <div
            className="absolute left-[-40%] bottom-[-80%] h-[120%] w-[52%] blur-3xl opacity-80 rotate"
            style={{
              background:
                "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
            }}
          /> */}
          <div className="flex h-full flex-col items-center justify-start mt-10 text-center">
            <h1 className="font-display mb-4 bg-clip-text text-center text-4xl font-bold tracking-tight whitespace-nowrap sm:text-5xl md:text-6xl lg:text-6xl">
              Meet Marvelous Features
            </h1>
            <p className="text-gray-300/90">
              Save Your team's time and effort with our comprehensive test management tool.
            </p>

            <div className="mt-20 grid grid-cols-3 grid-rows-3 gap-2 m-4 md:grid-cols-3 md:grid-rows-3 md:gap-2 max-w-5xl w-full h-[700px]">
  <div className="col-span-3 col-start-1 row-span-2 row-start-1 rounded-[52px] bg-[#131313] p-10 md:col-span-2 md:col-start-1 md:row-span-2 md:row-start-1 overflow-hidden relative">
    <RotatingEarth className="absolute 2xl:top-[-65%] 2xl:right-[-20%] right-[-25%] top-[-65%] opacity-40 scale-100" />
    {/* <Image src="/globe.png" alt="globe" width={240} height={240} className="absolute top-[-20] right-[-20] scale-145 opacity-35"/> */}

    {/* Tekst po lewej, ~1/3 wysokości */}
    <div className="absolute top-10 lg:top-20 lg:left-10 left-4 text-white">
      <p className="lg:text-6xl text-5xl font-light flex flex-row items-end justify-center group">
        40.8%
        <span>
          <ArrowRight className="mb-2 ml-2 size-4 -rotate-45 group-hover:translate-x-2 transition-all ease-in-out" />
        </span>
      </p>
      <p className="text-lg mt-2 w-fit font-light tracking-widest">Higher efficiency.</p>
    </div>

    {/* Sekcja dolna z marquee i kartą */}
    <div className="absolute bottom-0 left-0 right-0 px-10 text-white z-10">
      <Marquee pauseOnHover className="hidden lg:flex">
        <span className="flex flex-row items-center rounded-full bg-[#262626] pl-1 pr-3 py-1 text-md text-white/60 hover:bg-[#444444]">
          <span className="mr-2 flex size-6 items-center justify-center rounded-full bg-black/20">
            <Image src={CheckAllIcon} alt="" width={16} height={16} />
          </span>
          Execution Success
        </span>
        <span className="flex flex-row items-center rounded-full bg-[#262626] pl-1 pr-3 py-1 text-md text-white/60 hover:bg-[#262626]">
          <span className="mr-2 flex size-6 items-center justify-center rounded-full bg-black/20">
            <Image src={LinkIcon} alt="" width={16} height={16} />
          </span>
          Centralized runs updating live
        </span>
        <span className="flex flex-row items-center rounded-full bg-[#262626] pl-1 pr-3 py-1 text-md text-white/60 hover:bg-[#262626]">
          <span className="mr-2 flex size-6 items-center justify-center rounded-full bg-black/20">
            <Image src={TagIcon} alt="" width={16} height={16} />
          </span>
          Assign reviewer
        </span>
        <span className="flex flex-row items-center rounded-full bg-[#262626] pl-1 pr-3 py-1 text-md text-white/60 hover:bg-[#262626]">
          <span className="mr-2 flex size-6 items-center justify-center rounded-full bg-black/20">
            <Image src={BookmarkIcon} alt="" width={16} height={16} />
          </span>
          Quick pass
        </span>
      </Marquee>

      {/* osłony brzegów, pod spodem */}
      <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/2 bg-gradient-to-r from-white to-transparent dark:from-[#131313] dark:to-transparent z-0" />
      <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 bg-gradient-to-l from-white to-transparent dark:from-[#131313] dark:to-transparent z-0" />

      {/* karta z tytułem */}
      <div className="relative mt-4 rounded-2xl w-full h-[120px] items-center justify-center backdrop-blur-[2px] bg-white/0 z-20 flex flex-col mb-4 2xl:mb-4 2xl:mt-10">
        <p className="text-white text-2xl 2xl:text-3xl">Global Run Pulse</p>
        <p className="text-[#878787] text-md racking-wide leading-relaxed max-w-2xl 2xl:text-lg">Beyond tasks - a future-driven map of quality and clarity.</p>
      </div>
    </div>


                <div
                  className="absolute right-45 -bottom-20 2xl:-bottom-35  h-[30%] w-[102%] blur-3xl opacity-80 rotate"
                  style={{
                    background:
                      "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
                  }}
                />
              </div>
              <div className="col-span-3 col-start-1 row-span-2 row-start-4 rounded-[52px] bg-[#131313] py-4 md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-3 overflow-hidden">
                <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden">
                    <div className="flex flex-row items-center justify-center h-full space-x-2 ml-8">
                      <div className="h-full w-[160px] rounded-[28px] bg-[#1b1a1a] flex flex-col items-start justify-start space-y-4 p-4 relative overflow-hidden">
                        <Image src="/images/chart.png" alt="chart" width={224} height={224} className="absolute -bottom-4 rotate-y-180 right-0 opacity-30"/>
                        <p className="flex flex-row items-center justify-center"><span className="w-[5px] h-[18px] rounded-[34px] mr-1 bg-green-300"/>Financial</p>
                        <div className="flex flex-col items-start justify-start ml-2">
                          <p className="text-md text-green-300">Growth</p>
                          <p className="text-5xl font-light">19.2</p>
                          <p className="text-md">$2.7m</p>
                        </div>
                      </div>
                      <div className="h-full w-[160px] rounded-[28px] bg-[#1b1a1a] flex flex-col items-start justify-start space-y-4 p-4 relative overflow-hidden">
                        <Image src="/images/chart.png" alt="chart" width={224} height={224} className="absolute -bottom-4 rotate-y-180 right-0 opacity-30"/>
                        <p className="flex flex-row items-center justify-center"><span className="w-[5px] h-[18px] rounded-[34px] mr-1 bg-blue-300"/>Financial</p>
                        <div className="flex flex-col items-start justify-start ml-2">
                          <p className="text-md text-blue-300">Growth</p>
                          <p className="text-5xl font-light">3.4</p>
                          <p className="text-md">$1.3m</p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
              <div className="col-span-3 col-start-1 rounded-[52px] bg-[#131313] p-10 md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1 relative overflow-hidden">
                <div
                  className="absolute right-45 -bottom-20 2xl:-bottom-35  h-[30%] w-[102%] blur-3xl opacity-80 rotate"
                  style={{
                    background:
                      "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
                  }}
                />
                <div className="h-full w-full flex flex-col items-center justify-center space-y-18">
                  <Image src="/images/chart-features.png" alt="chart" width={242} height={242} />
                  <div className="text-center">
                    <p className="text-white text-2xl 2xl:text-3xl">Global Run Pulse</p>
                    <p className="text-[#878787] text-md racking-wide leading-relaxed max-w-2xl 2xl:text-lg">Future-driven map of quality.</p>
                  </div>
                </div>
              </div>
              <div className="col-span-3 col-start-1 row-start-3 rounded-[52px] bg-[#131313] md:col-span-2 md:col-start-2 md:row-span-2 md:row-start-3 relative overflow-hidden">
                <div className="h-full w-full flex flex-col items-center justify-center relative">
                  <Image src="/images/line-grid-5.png" alt="feature-graph" width={690} height={400} className="absolute left-0 invert opacity-20"/>
                  {/* <Image src="/images/line-grid-8.png" alt="feature-graph" width={690} height={400} className="absolute left-0 invert opacity-20 bottom-2"/> */}
                  <Image src="/images/line-grid-9.png" alt="feature-graph" width={690} height={400} className="absolute -left-3 invert opacity-20 bottom-4"/>
                  <div
                  className="absolute top-0 right-100 h-[30%] w-[102%] blur-3xl opacity-80 rotate"
                  style={{
                    background:
                      "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
                  }}
                />
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/chart-feature-1.png"
                      alt="feature-graph"
                      fill 
                      className="absolute inset-0 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Features
