"use client";

import { FC, ReactNode, useRef } from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

interface TextRevealByWordProps {
  text: string;
  className?: string;
  textClassName?: string;
  wordClassName?: string;
  ghostClassName?: string;
  heading?: ReactNode;
  headingClassName?: string;
}

const TextRevealByWord: FC<TextRevealByWordProps> = ({
  text,
  className,
  textClassName,
  wordClassName,
  ghostClassName,
  heading,
  headingClassName,
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });
  const words = text.split(" ");

  return (
    <section
      ref={targetRef}
      className={cn("relative z-0 h-[260vh] sm:h-[280vh]", className)}
    >
      <div
        className={cn(
          "sticky top-0 flex h-screen items-center justify-center px-4",
          "mx-auto max-w-5xl bg-transparent",
        )}
      >
        <div className="flex w-full flex-col items-center gap-10 text-center">
          {heading && (
            <div
              className={cn(
                "flex flex-col items-center gap-3",
                "text-white",
                headingClassName,
              )}
            >
              {heading}
            </div>
          )}
          <p
            className={cn(
              "flex flex-wrap justify-center text-center font-semibold text-black/20 dark:text-white/20",
              "p-6 text-xl md:p-10 md:text-2xl lg:p-12 lg:text-3xl xl:p-16 xl:text-4xl",
              textClassName,
            )}
          >
            {words.map((word, i) => {
              const start = i / words.length;
              const end = start + 1 / words.length;
              return (
                <Word
                  key={i}
                  progress={scrollYProgress}
                  range={[start, end]}
                  wordClassName={wordClassName}
                  ghostClassName={ghostClassName}
                >
                  {word}
                </Word>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
};

interface WordProps {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  wordClassName?: string;
  ghostClassName?: string;
}

const Word: FC<WordProps> = ({
  children,
  progress,
  range,
  wordClassName,
  ghostClassName,
}) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-1 lg:mx-2.5">
      <span className={cn("absolute opacity-30", ghostClassName)}>{children}</span>
      <motion.span
        style={{ opacity: opacity }}
        className={cn("text-black dark:text-white", wordClassName)}
      >
        {children}
      </motion.span>
    </span>
  );
};

export { TextRevealByWord };
