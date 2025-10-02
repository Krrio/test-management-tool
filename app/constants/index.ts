export type HighlightSlide = {
  id: number;
  textLists: string[];
  video: string;          
  videoDuration: number; 
};

export const hightlightsSlides: HighlightSlide[] = [
  {
    id: 1,
    textLists: [],
    video: "/assets/videos/frame2.mp4",
    videoDuration: 7,
  },
  {
    id: 2,
    textLists: ["Join the community"],
    video: "/assets/videos/frame4.mp4",
    videoDuration: 4,
  },
  {
    id: 3,
    textLists: [
      "Integrate with Your favourite apps"
    ],
    video: "/assets/videos/frame3.mp4",
    videoDuration: 5,
  },
  {
    id: 4,
    textLists: ["Save Your time."],
    video: "/assets/videos/frame5.mp4",
    videoDuration: 4,
  },
];

export const highlightsSlides = hightlightsSlides;

export const replayImg = "/assets/images/replay.svg";
export const pauseImg  = "/assets/images/pause.svg";
export const playImg   = "/assets/images/play.svg";
