import "@/app/home.css";
import { Companies } from "../socialproof";
import RotatingEarth from "../ui/wireframe-dotted-globe";

const Features = () => {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
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

            <div className="mt-20 grid grid-cols-3 grid-rows-3 gap-2 m-4 md:grid-cols-3 md:grid-rows-3 md:gap-2 max-w-5xl w-full h-full">
              <div className="col-span-3 col-start-1 row-span-2 row-start-1 rounded-[52px] bg-[#131313] p-10 md:col-span-2 md:col-start-1 md:row-span-2 md:row-start-1 overflow-hidden relative">
                
                <RotatingEarth className="absolute right-[-25%] top-[-50%] opacity-40"/>
                <div
            className="absolute right-45 -bottom-20 h-[30%] w-[102%] blur-3xl opacity-80 rotate"
            style={{
              background:
                "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
            }}
          />
              </div>
              <div className="col-span-3 col-start-1 row-span-2 row-start-4 rounded-[52px] bg-[#131313] p-10 md:col-span-1 md:col-start-1 md:row-span-2 md:row-start-3">
                1
              </div>
              <div className="col-span-3 col-start-1 rounded-[52px] bg-[#131313] p-10 md:col-span-1 md:col-start-3 md:row-span-2 md:row-start-1">
                2
              </div>
              <div className="col-span-3 col-start-1 row-start-3 rounded-[52px] bg-[#131313] p-10 md:col-span-2 md:col-start-2 md:row-span-2 md:row-start-3">
                3
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Features
