"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  hightlightsSlides,
  pauseImg,
  playImg,
  replayImg,
} from "@/app/constants";

gsap.registerPlugin(ScrollTrigger);

type ProcessType = "video-end" | "video-reset" | "pause" | "play";

interface VideoState {
  startPlay: boolean;
  videoId: number;
  isLastVideo: boolean;
  isPlaying: boolean;
}

const SLIDES_COUNT = hightlightsSlides.length;

const VideoCarousel = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<(HTMLVideoElement | null)[]>([]);
  const progressFillRef = useRef<(HTMLSpanElement | null)[]>([]);
  const progressTrackRef = useRef<(HTMLSpanElement | null)[]>([]);
  const previousVideoIdRef = useRef<number>(0);

  // Fallback czasowy
  const timeoutRef = useRef<number | null>(null);

  const [video, setVideo] = useState<VideoState>({
    startPlay: false,
    videoId: 0,
    isLastVideo: false,
    isPlaying: false,
  });

  const [loadedData, setLoadedData] = useState<number[]>([]);
  const { isLastVideo, startPlay, videoId, isPlaying } = video;

  // ===== helpers dla kropek/pasków =====
  const markDotCompleted = (idx: number) => {
    const fill = progressFillRef.current[idx];
    const track = progressTrackRef.current[idx];
    if (!fill || !track) return;
    gsap.to(track, { width: "12px", duration: 0.25, ease: "power2.out" });
    gsap.set(fill, { width: "100%", backgroundColor: "white" });
  };

  const markDotActiveReset = (idx: number) => {
    const fill = progressFillRef.current[idx];
    const track = progressTrackRef.current[idx];
    if (!fill || !track) return;
    gsap.set(track, { width: "12px" });
    gsap.set(fill, { width: "0%", backgroundColor: "#afafaf" });
  };

  const markDotPending = (idx: number) => {
    const fill = progressFillRef.current[idx];
    const track = progressTrackRef.current[idx];
    if (!fill || !track) return;
    gsap.set(track, { width: "12px" });
    gsap.set(fill, { width: "0%", backgroundColor: "#afafaf" });
  };

  const expandTrackForActive = (idx: number) => {
    const track = progressTrackRef.current[idx];
    if (!track) return;
    const targetWidth =
      window.innerWidth < 760 ? "10vw" : window.innerWidth < 1200 ? "10vw" : "4vw";
    gsap.to(track, { width: targetWidth, duration: 0.2, ease: "power1.out" });
  };

  // Przesuwanie karuzeli po zmianie slajdu
  useGSAP(
    () => {
      const slider = sliderRef.current;
      if (!slider) return;
      gsap.to(slider, {
        xPercent: -100 * videoId,
        duration: 1.5,
        ease: "power2.inOut",
      });
    },
    { dependencies: [videoId] },
  );

  // Start po wejściu sekcji w viewport
  useGSAP(
    () => {
      if (!containerRef.current) return;
      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 75%",
        once: true,
        onEnter: () => {
          setVideo((prev) => ({
            ...prev,
            startPlay: true,
            isPlaying: true,
          }));
        },
      });
      return () => trigger.kill();
    },
    { scope: containerRef },
  );

  // Konfiguracja kropek przy zmianie aktywnego slajdu
  useEffect(() => {
    for (let i = 0; i < SLIDES_COUNT; i++) {
      if (i < videoId) markDotCompleted(i);      // wcześniejsze = ukończone (kulki białe)
      else if (i === videoId) markDotActiveReset(i); // aktualny = bar zresetowany (gotowy do wzrostu)
      else markDotPending(i);                    // przyszłe = szare kulki
    }
  }, [videoId]);

  // PAUSE/PLAY: na pauzie NIE zwijamy do kółka – utrzymujemy bieżącą szerokość
  useEffect(() => {
    const fill = progressFillRef.current[videoId];
    const track = progressTrackRef.current[videoId];
    if (!fill || !track) return;

    if (!isPlaying) {
      // tylko zmiana koloru, bez zmiany width (żeby nie robić „kulki”)
      gsap.to(fill, { backgroundColor: "#afafaf", duration: 0.2 });
      // track zostaje w swojej aktualnej szerokości
    } else {
      // wznawiamy – upewnij się, że tor jest rozwinięty
      expandTrackForActive(videoId);
      gsap.to(fill, { backgroundColor: "white", duration: 0.2 });
    }
  }, [isPlaying, videoId]);

  // Fallback czasowy
  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const activeVideo = videoRef.current[videoId];
    const duration =
      hightlightsSlides[videoId]?.videoDuration ?? activeVideo?.duration ?? 0;

    if (!isPlaying || !startPlay || !duration) return;

    timeoutRef.current = window.setTimeout(() => {
      handleProcess("video-end", videoId);
    }, duration * 1000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isPlaying, startPlay]);

  // Sterowanie realnym <video>
  useEffect(() => {
    const currentVideo = videoRef.current[videoId];
    if (!currentVideo) return;

    const hasLoaded = loadedData.includes(videoId);
    if (!hasLoaded) return;

    if (previousVideoIdRef.current !== videoId) {
      currentVideo.currentTime = 0;
      previousVideoIdRef.current = videoId;
    }

    if (!isPlaying) {
      currentVideo.pause();
      return;
    }
    if (!startPlay) return;

    const playPromise = currentVideo.play();
    if (playPromise) {
      playPromise.catch(() => {
        setVideo((prev) => ({ ...prev, isPlaying: false }));
      });
    }
  }, [startPlay, videoId, isPlaying, loadedData]);

  const handleProcess = (type: ProcessType, i?: number) => {
    if (type === "video-reset") {
      videoRef.current.forEach((media) => {
        if (media) {
          media.currentTime = 0;
          media.pause();
        }
      });
      // zresetuj wszystkie kropki do stanu początkowego
      for (let k = 0; k < SLIDES_COUNT; k++) markDotPending(k);
    }

    setVideo((prev) => {
      switch (type) {
        case "video-end": {
          if (typeof i === "number") {
            // Zawsze po ZAKOŃCZENIU – zwijamy aktywny pasek do białej kulki (także dla ostatniego slajdu)
            markDotCompleted(i);
          }
          if (typeof i === "number" && i < SLIDES_COUNT - 1) {
            return {
              ...prev,
              videoId: i + 1,
              isLastVideo: false,
              isPlaying: true,
              startPlay: true,
            };
          }
          // jeśli to był ostatni – pokaż replay, ale kulka zmienia się DOPIERO po end (co właśnie nastąpiło)
          return {
            ...prev,
            isLastVideo: true,
            isPlaying: false,
          };
        }

        case "video-reset": {
          const media = videoRef.current[0];
          if (media) {
            media.currentTime = 0;
            const p = media.play();
            if (p) p.catch(() => {});
          }
          // po resecie: pierwsza aktywna, reszta szare
          markDotActiveReset(0);
          for (let k = 1; k < SLIDES_COUNT; k++) markDotPending(k);

          return {
            ...prev,
            videoId: 0,
            isLastVideo: false,
            isPlaying: true,
            startPlay: true,
          };
        }

        case "play": {
          const media = videoRef.current[prev.videoId];
          if (media) {
            const p = media.play();
            if (p) p.catch(() => {});
          }
          expandTrackForActive(prev.videoId);
          return { ...prev, isPlaying: true, startPlay: true };
        }

        case "pause": {
          const media = videoRef.current[prev.videoId];
          media?.pause();
          // brak zmian w szerokości toru/filu – zostają jak są
          return { ...prev, isPlaying: false };
        }

        default:
          return prev;
      }
    });
  };

  const handleIndicatorActivate = (index: number) => {
    const targetMedia = videoRef.current[index];

    const resetToStart = () => {
      markDotActiveReset(index);
      if (targetMedia) {
        targetMedia.pause();
        targetMedia.currentTime = 0;

        if (loadedData.includes(index)) {
          const playPromise = targetMedia.play();
          if (playPromise) {
            playPromise.catch(() => {
              setVideo((prev) => ({ ...prev, isPlaying: false }));
            });
          }
        }
      }
    };

    if (index === videoId) {
      resetToStart();
      setVideo((prev) => ({
        ...prev,
        isPlaying: true,
        startPlay: true,
      }));
      return;
    }

    const currentMedia = videoRef.current[videoId];
    if (currentMedia) {
      currentMedia.pause();
    }

    setVideo((prev) => ({
      ...prev,
      videoId: index,
      isLastVideo: index === SLIDES_COUNT - 1,
      isPlaying: true,
      startPlay: true,
    }));

    resetToStart();
  };

  const handleLoadedMetaData = (index: number) => {
    setLoadedData((prev) => (prev.includes(index) ? prev : [...prev, index]));
    const media = videoRef.current[index];
    if (!media) return;

    if (index === videoId && startPlay) {
      const p = media.play();
      if (p) {
        p.then(() => {
          setVideo((prev) => ({ ...prev, isPlaying: true }));
          expandTrackForActive(index);
        }).catch(() => {
          setVideo((prev) => ({ ...prev, isPlaying: false }));
        });
      }
    }
  };

  // Aktualizacja paska postępu na bazie onTimeUpdate
  const handleTimeUpdate = (i: number, el: HTMLVideoElement) => {
    const d = hightlightsSlides[i]?.videoDuration || el.duration || 0;
    if (!d) return;

    const percent = Math.min(100, (el.currentTime / d) * 100);

    const fill = progressFillRef.current[i];
    const track = progressTrackRef.current[i];
    if (!fill || !track) return;

    // upewnij się, że aktywny tor jest rozwinięty
    expandTrackForActive(i);

    // aktualizuj tylko szerokość i kolor
    gsap.set(fill, { width: `${percent}%`, backgroundColor: isPlaying ? "white" : "#afafaf" });

    // 100% -> zamień w kulkę (po faktycznym końcu)
    if (percent >= 100) {
      markDotCompleted(i);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <div className="relative w-full overflow-hidden">
        <div ref={sliderRef} className="flex w-full">
          {hightlightsSlides.map((list, i) => (
            <div
              key={list.id}
              className="flex w-full flex-shrink-0 justify-center px-4"
            >
              <div className="video-carousel_container">
                <div className="flex-center h-full w-full overflow-hidden rounded-3xl bg-black">
                  <video
                    playsInline
                    autoPlay
                    muted
                    preload="auto"
                    className="pointer-events-none"
                    ref={(el) => {
                      videoRef.current[i] = el;
                    }}
                    onEnded={() => handleProcess("video-end", i)}
                    onPlay={() =>
                      setVideo((prev) => ({ ...prev, isPlaying: true }))
                    }
                    onLoadedMetadata={() => handleLoadedMetaData(i)}
                    onCanPlay={() => handleLoadedMetaData(i)}
                    onTimeUpdate={(e) => handleTimeUpdate(i, e.currentTarget)}
                  >
                    <source src={list.video} type="video/mp4" />
                  </video>
                </div>

                <div className="absolute left-[5%] top-12 z-10">
  {list.textLists.map((text, idx) => (
    <p
      key={idx}
      className={`text-xl font-medium md:text-2xl ${
        list.id === 2 ? "text-black" : "text-white"
      }`}
    >
      {text}
    </p>
  ))}
</div>

              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-10 flex items-center gap-4">
        <div className="flex items-center rounded-full bg-[#191919] px-7 py-5 backdrop-blur">
          {hightlightsSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Zobacz podgląd ${i + 1}`}
              onClick={() => handleIndicatorActivate(i)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleIndicatorActivate(i);
                }
              }}
              className="relative mx-2 flex h-3 w-3 cursor-pointer items-center justify-center rounded-full bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span
                className="relative flex h-full w-full items-center justify-center rounded-full bg-[#e9e9e9]"
                ref={(el) => {
                  progressTrackRef.current[i] = el;
                }}
              >
                <span
                  className="absolute h-full w-full rounded-full"
                  ref={(el) => {
                    progressFillRef.current[i] = el;
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        <button
          aria-label={isLastVideo ? "replay" : !isPlaying ? "play" : "pause"}
          onClick={
            isLastVideo
              ? () => handleProcess("video-reset")
              : !isPlaying
              ? () => handleProcess("play")
              : () => handleProcess("pause")
          }
        >
          <Image
            src={isLastVideo ? replayImg : !isPlaying ? playImg : pauseImg}
            alt={isLastVideo ? "replay" : !isPlaying ? "play" : "pause"}
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </button>
      </div>
    </div>
  );
};

export default VideoCarousel;
