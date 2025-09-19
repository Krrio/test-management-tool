"use client";

import { useEffect } from "react";
import smoothscroll from "smoothscroll-polyfill";

export function SmoothScrollProvider() {
  useEffect(() => {
    smoothscroll.polyfill();
    const root = document.documentElement;
    const originalBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = originalBehavior;
    };
  }, []);

  return null;
}
