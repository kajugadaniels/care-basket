// User-facing text for the family manager area (accessibility.md § 9).

export const familyLayoutCopy = {
  areaLabel: "Family manager",
  navLabel: "Family manager",
  nav: {
    overview: "Overview",
  },
} as const;

export const familyDashboardCopy = {
  metaTitle: "Your family",
  greeting: (firstName: string) => `Welcome, ${firstName}`,
  greetingFallback: "Welcome to CareBasket",
  lead: "This is your family space. From here, you'll look after the shopping for the people you care for.",
  noticeTitle: "Family setup is coming soon",
  noticeText:
    "CareBasket is still being built. Your account is ready, but nothing has been set up for your family yet, and the features below are not available.",
} as const;

export const setupPreviewCopy = {
  title: "What you'll be able to do",
  description: "These steps are planned for upcoming releases.",
  comingSoon: "Coming soon",
  items: [
    {
      id: "family",
      title: "Create your family",
      description: "Name your family and set yourself up as its manager.",
    },
    {
      id: "profiles",
      title: "Add a parent, grandparent, or child",
      description:
        "Create a simple profile for each person you shop for. They won't need an email address or password.",
    },
    {
      id: "devices",
      title: "Connect their device",
      description: "Approve their phone or tablet with a short code so they can ask for groceries.",
    },
    {
      id: "requests",
      title: "Review their shopping requests",
      description: "See each item and the total, then change, remove, or decline anything.",
    },
    {
      id: "payments",
      title: "Pay through PayPal",
      description:
        "Pay only when you choose to. This demo will use PayPal Sandbox, so no real money moves.",
    },
  ],
} as const;

export type SetupStepId = (typeof setupPreviewCopy.items)[number]["id"];
