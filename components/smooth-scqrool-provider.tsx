"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export function SmoothScqroolProvider() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    let clampY = gsap.utils.clamp(0, maxScroll);
    let targetY = window.scrollY;
    let ticking = false;
    let animation: gsap.core.Tween | null = null;

    const updateBounds = () => {
      maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      clampY = gsap.utils.clamp(0, maxScroll);
      targetY = clampY(targetY);
    };

    const animate = () => {
      ticking = false;
      animation?.kill();
      animation = gsap.to(window, {
        duration: 0.6,
        scrollTo: targetY,
        ease: "power3.out",
        overwrite: "auto",
        onComplete: () => {
          animation = null;
          targetY = window.scrollY;
        },
      });
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetY = clampY(targetY + event.deltaY);
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(animate);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const largeStep = window.innerHeight * 0.9;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          targetY = clampY(targetY + 120);
          break;
        case "ArrowUp":
          event.preventDefault();
          targetY = clampY(targetY - 120);
          break;
        case "PageDown":
          event.preventDefault();
          targetY = clampY(targetY + largeStep);
          break;
        case "PageUp":
          event.preventDefault();
          targetY = clampY(targetY - largeStep);
          break;
        case "Home":
          event.preventDefault();
          targetY = 0;
          break;
        case "End":
          event.preventDefault();
          targetY = maxScroll;
          break;
        default:
          return;
      }

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(animate);
      }
    };

    const onResize = () => {
      updateBounds();
    };

    const onScroll = () => {
      if (!animation) {
        targetY = window.scrollY;
      }
    };

    let interactionsActive = false;

    const removeInteractions = () => {
      if (!interactionsActive) {
        return;
      }
      interactionsActive = false;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (animation) {
        animation.kill();
        animation = null;
      }
    };

    const addInteractions = () => {
      if (interactionsActive) {
        return;
      }
      interactionsActive = true;
      updateBounds();
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", onScroll, { passive: true });
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        removeInteractions();
      } else {
        targetY = window.scrollY;
        addInteractions();
      }
    };

    const addMotionListener =
      typeof prefersReducedMotion.addEventListener === "function"
        ? () => prefersReducedMotion.addEventListener("change", handleMotionChange)
        : () => prefersReducedMotion.addListener(handleMotionChange);

    const removeMotionListener =
      typeof prefersReducedMotion.removeEventListener === "function"
        ? () => prefersReducedMotion.removeEventListener("change", handleMotionChange)
        : () => prefersReducedMotion.removeListener(handleMotionChange);

    addMotionListener();

    if (!prefersReducedMotion.matches) {
      addInteractions();
    }

    return () => {
      removeInteractions();
      removeMotionListener();
      gsap.killTweensOf(window);
    };
  }, []);

  return null;
}
