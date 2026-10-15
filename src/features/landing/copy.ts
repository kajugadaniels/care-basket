// User-facing text for the public landing page (accessibility.md § 9).
// People in examples are fictional.

export const landingCopy = {
	carouselLabel: "About CareBasket",
	slideStatus: ({ current, total, label }: { current: number; total: number; label: string }) =>
		`Slide ${current} of ${total}: ${label}`,
	previous: "Previous slide",
	next: "Next slide",
	showSlide: (label: string) => `Show ${label}`,
	slides: [
		{
			id: "welcome",
			label: "Welcome",
			title: "Ask for groceries. Your family handles the rest.",
			description: "CareBasket helps adults aged 18 or older ask for everyday essentials without navigating a complicated checkout.",
			items: [
				{ id: "speak", title: "Speak" },
				{ id: "type", title: "Type" },
				{ id: "pictures", title: "Choose pictures" },
			],
		},
		{
			id: "how-it-works",
			label: "How it works",
			title: "A clear path from request to review.",
			description: "The person asking stays involved, while a trusted adult controls the payment.",
			items: [
				{ id: "ask", title: "Ask", description: "Speak, type, or choose products by picture." },
				{ id: "check", title: "Check", description: "Review the matched products and quantities." },
				{ id: "review", title: "Review", description: "A family manager checks every item and the total." },
				{ id: "pay", title: "Decide", description: "Only the family manager can approve payment." },
			],
		},
		{
			id: "families",
			label: "For families",
			title: "Simple for the requester. Clear for the manager.",
			description: "Each person sees only the tools needed for their part of the shopping list.",
			items: [
				{ id: "requester", title: "For the person asking", description: "No account setup, payment screen, or complicated form. Just a familiar way to ask." },
				{ id: "manager", title: "For the family manager", description: "Connect devices, review requests, adjust quantities, and decide whether to pay." },
			],
		},
		{
			id: "trust",
			label: "Trust",
			title: "Help without giving up control.",
			description: "CareBasket is designed around consent, readable interfaces, and deliberate decisions.",
			items: [
				{ id: "connections", title: "Approved connections", description: "A manager approves every connected device." },
				{ id: "payments", title: "Manager-controlled payments", description: "Requesters never enter payment details." },
				{ id: "access", title: "Accessible by design", description: "Clear language, visible focus, and generous controls." },
				{ id: "privacy", title: "Private by default", description: "Only necessary data is kept, and voice recordings are never stored." },
			],
		},
	] as const,
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
	caption: "Illustrative preview with fictional data. It is not a real grocery order.",
} as const;

export type LandingSlideId = (typeof landingCopy.slides)[number]["id"];
export type PreviewItemId = (typeof previewCopy.items)[number]["id"];
