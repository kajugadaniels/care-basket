// User-facing text for the family manager area (accessibility.md § 9).

export const familyLayoutCopy = {
	loading: "Loading your family workspace…",
	loadingHelp: "Getting this page ready for you.",
	testEnvironment: "Test environment — no real purchases",
  areaLabel: "Family manager",
  navLabel: "Family manager",
  nav: {
    overview: "Overview",
    members: "Family Members",
    devices: "Devices",
		requests: "Requests",
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
	adultConfirmation: "I am at least 18 and will use CareBasket only with adults aged 18 or older.",
	adultConfirmationHint: "CareBasket does not support accounts or shopping access for children.",
	adultConfirmationError: "Confirm that you are at least 18 and will use CareBasket only with adults.",
  submit: "Create My Family",
  submitting: "Creating your family…",
  loading: "Loading the family setup form…",
  reassurance:
    "That's all we need for now. Next, you can add the people you shop for.",
} as const;

export const familyDashboardCopy = {
	metaTitle: "Your family",
	greeting: (displayName: string) => `Welcome back, ${displayName}`,
	intro: "Review new shopping lists and manage the people you help.",
	roles: {
		OWNER: "Owner",
		MANAGER: "Manager",
	},
	atAGlance: "Family workspace",
	readyText: "Add someone you help so they can start a shopping list.",
	membersHelp: "Manage family profiles and their access.",
	requestsHelp: (count: number) =>
		`${count === 1 ? "A shopping list is" : "Shopping lists are"} ready for you to review.`,
	memberCount: ({ count }: { count: number }) =>
		`${count} ${new Intl.PluralRules("en-US").select(count) === "one" ? "family member" : "family members"}`,
	addMember: "Add Family Member",
	viewMembers: "View Family Members",
	loading: "Loading your family…",
} as const;
