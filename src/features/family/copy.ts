// User-facing text for the family manager area (accessibility.md § 9).

export const familyLayoutCopy = {
  areaLabel: "Family manager",
  navLabel: "Family manager",
  nav: {
    overview: "Overview",
    members: "Family Members",
    devices: "Devices",
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
  loading: "Loading the family setup form…",
  reassurance:
    "That's all we need for now. Next, you can add the people you shop for.",
} as const;

export const familyDashboardCopy = {
  metaTitle: "Your family",
  greeting: (displayName: string) => `Welcome back, ${displayName}`,
  familyLabel: "Your family",
  roles: {
    OWNER: "Owner",
    MANAGER: "Manager",
  },
  readyText:
    "Add someone you care for. They won't need an email address or password.",
  memberCount: ({ count }: { count: number }) =>
    `Your family has ${count} ${new Intl.PluralRules("en-US").select(count) === "one" ? "member" : "members"}.`,
  addMember: "Add Family Member",
  viewMembers: "View Family Members",
  loading: "Loading your family…",
} as const;

export const setupPreviewCopy = {
  title: "Coming next",
  description: "These features are planned and not available yet.",
  comingSoon: "Coming soon",
  items: [
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
