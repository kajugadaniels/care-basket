// User-facing text for the family manager area (accessibility.md § 9).

export const familyLayoutCopy = {
  areaLabel: "Family manager",
  navLabel: "Family manager",
  nav: {
    overview: "Overview",
  },
} as const;

export const familySetupCopy = {
  metaTitle: "Set up your family",
  title: "Let's set up your family",
  description: "Give your family a name so you can start helping the people you care about.",
  familyNameLabel: "Family name",
  familyNameHint: "For example, Jane's Family",
  displayNameLabel: "Your display name",
  displayNameHint: "What your family calls you. For example, Jane",
  submit: "Create My Family",
  submitting: "Creating your family…",
  reassurance:
    "That's all we need for now. You'll add the people you shop for in a later step.",
} as const;

export const familyDashboardCopy = {
  metaTitle: "Your family",
  greeting: (displayName: string) => `Welcome back, ${displayName}`,
  familyLabel: "Your family",
  roles: {
    OWNER: "Owner",
    MANAGER: "Manager",
  },
  readyTitle: "Your family is ready",
  readyText:
    "Next, you can add someone you care for. Adding parents, grandparents, and children is coming soon.",
} as const;

export const setupPreviewCopy = {
  title: "Coming next",
  description: "These features are planned and not available yet.",
  comingSoon: "Coming soon",
  items: [
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
