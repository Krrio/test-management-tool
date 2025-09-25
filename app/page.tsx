import Features from "@/components/sections/Features";
import "./home.css";
import Hero from "@/components/sections/Hero";
import { SmoothScqroolProvider } from "@/components/smooth-scqrool-provider";
import { Companies } from "@/components/socialproof";
import Insights from "@/components/sections/Insights";

export default function Home() {
  return (
    <>
      <SmoothScqroolProvider />
      <Hero />
      <div className="my-6 w-full">
        <Companies />
      </div>
      <Features />
      <Insights />
    </>
  );
}
