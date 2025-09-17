"use client";

import { motion } from "motion/react";
import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
}

const navs: NavItem[] = [
  {  name: "Home", href: "#home" },
  {  name: "About", href: "#about" },
  {  name: "Services", href: "#services" },
  {  name: "Contact", href: "#contact" },
];

type HeaderProps = {
  variant?: "default" | "compact";
  className?: string;
  ulClassName?: string;
};

export function Header({ variant = "default", className, ulClassName }: HeaderProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);

  const handleMouseEnter = (e: React.MouseEvent<HTMLLIElement>) => {
    const node = e.currentTarget;
    const rect = node.getBoundingClientRect();
    setLeft(node.offsetLeft);
    setWidth(rect.width);
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <header className={cn("w-full", variant === "compact" ? "py-0" : "py-20", className)}>
      <ul
        onMouseLeave={handleMouseLeave}
        className={cn("relative mx-auto flex w-fit rounded-full border p-1 px-1.5 bg-white/5 backdrop-blur", ulClassName)}
        ref={ref}
      >
        {navs.map((item) => (
          <li
            key={item.name}
            onMouseEnter={handleMouseEnter}
            className="z-10 block cursor-pointer px-4 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary text-primary/60 tracking-tight"
          >
            <a href={item.href}>{item.name}</a>
          </li>
        ))}
        <motion.li
          animate={{ left, width, opacity }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute inset-0 my-1.5 rounded-full bg-secondary"
        />
      </ul>
    </header>
  );
}
