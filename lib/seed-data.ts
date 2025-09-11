export type DemoStep = { id: string; title: string; description: string };
export type DemoSection = { id: string; name: string; steps: DemoStep[] };
export type DemoModule = { id: string; name: string; sections: DemoSection[] };
export type DemoProject = { id: string; name: string; modules: DemoModule[] };

export const demoProjects: DemoProject[] = [
  {
    id: "mwo",
    name: "MWO",
    modules: [
      {
        id: "monetization",
        name: "Monetization",
        sections: [
          {
            id: "so",
            name: "SO",
            steps: [
              { id: "so-1", title: "Open Store", description: "Open the store from the main menu" },
              { id: "so-2", title: "Load Offers", description: "Verify offers load with correct prices" },
              { id: "so-3", title: "Offer Details", description: "Check details modal opens and content is correct" },
              { id: "so-4", title: "Offer Details Chained", description: "Check details Offer Details Chained" },
              { id: "so-5", title: "Offer Details Test", description: "Check details Offer Details Test" },
            ],
          },
          {
            id: "chest-iap",
            name: "Chest & IAP",
            steps: [
              { id: "ci-1", title: "Open Chest", description: "Open a free chest and observe rewards" },
              { id: "ci-2", title: "Purchase IAP", description: "Buy a small IAP and verify receipt" },
            ],
          },
          {
            id: "currencies",
            name: "Currencies",
            steps: [
              { id: "cur-1", title: "Balance UI", description: "Balances are shown and update in real-time" },
              { id: "cur-2", title: "Spend", description: "Spending reduces currency as expected" },
              { id: "cur-3", title: "Gain", description: "Gaining increases currency as expected" },
            ],
          },
          {
            id: "buttons",
            name: "Buttons",
            steps: [
              { id: "btn-1", title: "Disabled State", description: "Buttons show disabled state when unavailable" },
              { id: "btn-2", title: "Click Action", description: "Primary actions trigger the correct flow" },
            ],
          },
        ],
      },
      {
        id: "onboarding",
        name: "Onboarding",
        sections: [
          {
            id: "tutorial",
            name: "Tutorial",
            steps: [
              { id: "tut-1", title: "Start Tutorial", description: "Tutorial starts after first launch" },
              { id: "tut-2", title: "Hints", description: "Hints appear contextually and can be dismissed" },
            ],
          },
        ],
      },
    ],
  },
];

