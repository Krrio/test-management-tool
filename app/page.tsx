import Features from "@/components/sections/Features";
import "./home.css";
import Hero from "@/components/sections/Hero";
import { SmoothScqroolProvider } from "@/components/smooth-scqrool-provider";

export default function Home() {
  return (
    <>
      <SmoothScqroolProvider />
      <Hero />
      <Features />
    </>
  );
}
