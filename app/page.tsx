import Features from "@/components/sections/Features";
import "./home.css";
import Hero from "@/components/sections/Hero";
import { SmoothScqroolProvider } from "@/components/smooth-scqrool-provider";
import { Companies } from "@/components/socialproof";

export default function Home() {
  return (
    <>
      <SmoothScqroolProvider />
      <Hero />
      <div className="my-6 w-full">
        <Companies />
      </div>x
      <Features />
    </>
  );
}
