export const footerCopy = {
	description: "CareBasket helps people ask for groceries by typing or choosing pictures. A trusted family member reviews each request and decides whether to pay. Voice remains gated while provider eligibility is reviewed.",
	navigationTitle: "Explore",
	links: [
		{ href: "/", label: "Home" },
		{ href: "/#how-it-works", label: "How it works" },
		{ href: "/#families", label: "For families" },
		{ href: "/#commitments", label: "Our commitments" },
		{ href: "/data-sources", label: "Data sources" },
		{ href: "/privacy", label: "Privacy" },
	],
	disclosureTitle: "About this demo",
	disclosures: [
		"CareBasket is being built for the PayPal AI Hackathon 2026. It is a demonstration in development, not a live service.",
		"The PayPal Sandbox payment integration is implemented and disabled by default until controlled verification. It uses test accounts; no real money moves. A successful end-to-end payment is not claimed here. The merchant, prices and fulfillment are simulated, and no real grocery orders or deliveries take place. People in examples are fictional.",
		"CareBasket is an independent project and is not affiliated with or endorsed by PayPal.",
	],
} as const;
