// User-facing text for the public landing page (accessibility.md § 9).
// People in examples are fictional.

export const heroCopy = {
  status: "Hackathon demo, in development",
  title: "Just tell us what you need. Your family takes care of the rest.",
  description:
    "CareBasket makes asking for groceries easy. Speak, type, or choose pictures. Your family can review your basket and pay securely.",
  primaryAction: "See How It Works",
  waysToAskLabel: "Ways to ask",
  waysToAsk: [
    { id: "speak", label: "Speak" },
    { id: "type", label: "Type" },
    { id: "pictures", label: "Choose pictures" },
  ],
} as const;

export const previewCopy = {
  badge: "Example preview",
  requestLabel: "Rose said",
  request: "I need milk, a loaf of bread, some bananas, and a dozen eggs.",
  basketTitle: "Rose's basket",
  quantityLabel: "Quantity",
  items: [
    { id: "milk", name: "Whole milk", detail: "Half gallon", quantity: 1 },
    { id: "bread", name: "Whole wheat bread", detail: "1 loaf", quantity: 1 },
    { id: "bananas", name: "Bananas", detail: "About 2 lb", quantity: 1 },
    { id: "eggs", name: "Large eggs", detail: "12 eggs", quantity: 1 },
  ],
  status: "Ready to send to Anna for review",
  caption:
    "Illustrative preview with example data. It shows how a request could look and is not a working feature yet.",
} as const;

export const howItWorksCopy = {
  title: "How CareBasket works",
  description: "Four simple steps, with a trusted adult in control of every payment.",
  steps: [
    {
      id: "ask",
      title: "Say what you need.",
      description: "Speak, type, or tap pictures. There are no long forms to fill in.",
    },
    {
      id: "prepare",
      title: "CareBasket prepares your basket.",
      description:
        "We match your words to grocery items and show them as pictures. You check the list before it is sent.",
    },
    {
      id: "review",
      title: "Your family reviews the request.",
      description: "A trusted adult sees each item and the total, and can change or remove anything.",
    },
    {
      id: "pay",
      title: "They can approve payment through PayPal.",
      description:
        "Nothing is paid unless they choose to pay. You see a clear message when it is done.",
    },
  ],
} as const;

export const familiesCopy = {
  title: "Built for families",
  description:
    "Two simple experiences that work together. One person asks, and a trusted adult reviews and decides.",
  audiences: [
    {
      id: "requester",
      role: "For the person asking",
      title: "Asking is easy",
      summary:
        "Made for older adults and anyone who finds online shopping hard, with supervised options for children.",
      points: [
        "No complicated account registration",
        "Voice, text, or picture-based requests",
        "Simple screens with large, readable text",
      ],
    },
    {
      id: "manager",
      role: "For the family manager",
      title: "You stay in control",
      summary: "A trusted adult sets everything up and makes the final decision.",
      points: [
        "Create family profiles",
        "Connect trusted devices",
        "Review grocery requests",
        "Decide whether to pay",
      ],
    },
  ],
} as const;

export const commitmentsCopy = {
  title: "Trust and accessibility",
  description:
    "CareBasket is still being built. These are the commitments every feature must keep.",
  items: [
    {
      id: "connections",
      title: "Secure family connections",
      description:
        "A device joins a family only after a signed-in adult approves it, and it can be disconnected at any time.",
    },
    {
      id: "payments",
      title: "Adult-approved payments",
      description:
        "Only a trusted adult can pay. People asking for groceries never see payment screens.",
    },
    {
      id: "simplicity",
      title: "Simple interfaces",
      description:
        "Large text, big buttons, and one clear action on each screen, designed to meet WCAG 2.2 AA.",
    },
    {
      id: "privacy",
      title: "Privacy-conscious design",
      description: "We collect as little as possible and never keep voice recordings.",
    },
  ],
} as const;

export type WayToAskId = (typeof heroCopy.waysToAsk)[number]["id"];
export type PreviewItemId = (typeof previewCopy.items)[number]["id"];
export type StepId = (typeof howItWorksCopy.steps)[number]["id"];
export type AudienceId = (typeof familiesCopy.audiences)[number]["id"];
export type CommitmentId = (typeof commitmentsCopy.items)[number]["id"];
