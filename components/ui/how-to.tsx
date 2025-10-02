"use client";

import { useRef, type CSSProperties, type MouseEvent } from "react";
import LaserFlow from "../LaserFlow";

type RevealImageStyle = CSSProperties & {
  "--mx": string;
  "--my": string;
};

const containerStyle: CSSProperties = {
  height: "800px",
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#060010",
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translateX(-50%)",
  width: "86%",
  height: "60%",
  backgroundColor: "#060010",
  borderRadius: "20px",
  border: "2px solid #FF79C6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: "2rem",
  zIndex: 6,
};

const defaultRevealImageStyle: RevealImageStyle = {
  position: "absolute",
  width: "100%",
  top: "-50%",
  zIndex: 5,
  mixBlendMode: "lighten",
  opacity: 0.3,
  pointerEvents: "none",
  "--mx": "-9999px",
  "--my": "-9999px",
  WebkitMaskImage:
    "radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)",
  maskImage:
    "radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};

function HowTo() {
  const revealImgRef = useRef<HTMLImageElement | null>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const el = revealImgRef.current;

    if (!el) return;

    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y + rect.height * 0.5}px`);
  };

  const handleMouseLeave = () => {
    const el = revealImgRef.current;

    if (!el) return;

    el.style.setProperty("--mx", "-9999px");
    el.style.setProperty("--my", "-9999px");
  };

  return (
    <div
      style={containerStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <LaserFlow horizontalBeamOffset={0.1} verticalBeamOffset={0} color="#FF79C6" />

      <div style={overlayStyle}>{/* Your content here */}</div>

      <img
        ref={revealImgRef}
        src="/path/to/image.jpg"
        alt="Reveal effect"
        style={defaultRevealImageStyle}
      />
    </div>
  );
}

export default HowTo;
