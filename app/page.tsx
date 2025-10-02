import Features from "@/components/sections/Features";
import "./home.css";
import Hero from "@/components/sections/Hero";
import { SmoothScqroolProvider } from "@/components/smooth-scqrool-provider";
import { Companies } from "@/components/socialproof";
import Insights from "@/components/sections/Insights";
import Tutorial from "@/components/sections/Tutorial";
import Highlights from "@/components/sections/Higihligths";
import Footer from "@/components/sections/Footer";

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
      <Tutorial />
      <Highlights />
      <Footer />
    </>
  );
}
