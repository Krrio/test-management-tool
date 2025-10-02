import VideoCarousel from "../ui/VideoCarousel";

const Higihligths = () => {
  return (
    <main className="font-devis relative mb-6 w-full overflow-hidden">
      <div className="relative z-10 h-full w-full bg-black">
        <div className="relative mx-auto flex h-screen max-w-[calc(100%-2rem)] items-center justify-center overflow-hidden rounded-[32px] bg-black/85 text-white shadow-2xl flex-col">
        <div
              className="absolute right-[-10%] top-[-30%] h-[60%] w-[82%] blur-3xl"
              style={{
                background:
                  "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
              }}
            />
            {/* bottom-left small blob */}
            <div
              className="absolute left-[-50%] bottom-[-65%] h-[60%] w-[82%] blur-3xl"
              style={{
                background:
                  "radial-gradient(75% 62% at 80% 12%, rgba(255,255,255,0.92) 0%, rgba(243,248,246,0.62) 24%, rgba(206,232,218,0.32) 48%, rgba(0,0,0,0) 72%)",
              }}
            />
            <p className="w-full max-w-7xl sm:text-5xl text-3xl my-8 text-[#e9e9e9] ml-60">
                Get the highlights.
            </p>
          <VideoCarousel />
        </div>
      </div>
    </main> 
  );
};

export default Higihligths;
