import "@/app/home.css";
import { Companies } from "../socialproof";

const Features = () => {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative h-full max-w-[calc(100%-2rem)] mx-auto bg-black/85 text-white overflow-hidden rounded-[32px] shadow-2xl">
        <div
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
            />
        <div className="flex flex-col items-center justify-start h-full text-center mt-10">
            <h1 className="font-bold bg-clip-text whitespace-nowrap text-center font-display text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-6xl mb-4">
              Meet Marvelous Features
            </h1>
            <p className="text-gray-300/90">
              Save Your team's time and effort with our comprehensive test management tool.
            </p>
        </div>
        </div>
      </div>
    </main>
  )
}

export default Features