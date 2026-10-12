export const privacyCopy = {
	title: "Privacy at CareBasket",
	description: "What this prototype stores, who processes it, and how to ask for deletion.",
	updated: "Updated October 12, 2026",
	intro: "CareBasket helps people ask a trusted family member for groceries. This is a hackathon prototype, not a live grocery service. Use fictional people and test accounts. No real orders or deliveries take place.",
	sections: [
		{ id: "identity", title: "Sign-in and family profiles", paragraphs: [
			"Clerk handles adult names, email addresses, sign-in credentials and authentication cookies. CareBasket stores a Clerk identifier, a family name and the adult’s chosen family display name in Neon PostgreSQL—not their password.",
			"A manager creates each assisted-adult or child profile with a nickname, profile type, preset avatar and language setting. We record who created it and when consent was confirmed. The manager must be a parent or guardian, or have the person’s permission. Profiles do not need an email or password.",
		] },
		{ id: "devices", title: "Connecting a device", paragraphs: [
			"A device can connect only after a signed-in family manager approves it. Necessary cookies keep the short-lived pairing and device connection working. The database stores hashes of device tokens and pairing secrets, device labels, a browser summary and last-use times. Disconnecting a device prevents its next protected request.",
			"Rate limiting uses a short-lived keyed hash of a trusted client IP address, not a stored raw IP. CareBasket adds no advertising, analytics or session-replay service. Hosting and authentication providers have their own operational logs.",
		] },
		{ id: "shopping", title: "Shopping lists and saved reviews", paragraphs: [
			"Neon stores shopping requests, selected products, quantities, optional typed text or transcripts, any supplied per-request budget, consent records, status history and security audit records. Managers can review their family’s requests. Connected devices can read only their own profile’s requests and never receive payment amounts or payer details.",
			"Before Send, a private encrypted review can keep your words and product matches for up to 30 minutes, or less if its proof expires. Its URL contains only an access-controlled lookup identifier. It contains no recording or prices. A new interpretation replaces the review. Your unsent shopping-list draft otherwise stays in browser memory and is lost on reload or closing the page.",
		] },
		{ id: "voice", title: "Voice and Google Gemini", paragraphs: [
			"Gemini processing and voice interpretation are currently disabled for this child-accessible deployment while provider eligibility is unresolved. Turning on a profile setting alone cannot enable them. Pictures and simple text matching continue to work without Gemini. Children’s data is never sent to Gemini.",
			"If an eligible deployment is approved, an assisted adult’s manager must separately confirm that person’s agreement before Google processes text or audio. Microphone access starts only after a button press. Recordings are handled in memory and discarded; CareBasket never saves them to files, logs or the database. Names and family history are not included in AI requests.",
			"Google’s unpaid API terms allow use of submitted content to improve products and possible human review. A paid-tier service and an eligibility review are required before any real person’s data is processed. Do not include sensitive information in a test request.",
		] },
		{ id: "payments", title: "PayPal Sandbox", paragraphs: [
			"Only an authenticated adult manager can pay. PayPal processes approval using Sandbox test accounts; no real money moves. CareBasket stores order and capture identifiers, amounts, currency, verified status and minimal event metadata—not payer names, payer emails, passwords or card information. Checkout requests no shipping address.",
			"The merchant and prices are simulated. Verified payment is separate from simulated delivery. The Sandbox integration is implemented, but a successful end-to-end transaction is not claimed until the operator verifies it.",
		] },
		{ id: "providers", title: "Service providers and product sources", paragraphs: [
			"Clerk processes sign-in data; Neon hosts application data; the hosting provider serves requests and operational logs; PayPal handles Sandbox approval. Google would process eligible assisted-adult requests only after the gates above are satisfied. These providers apply their own terms and retention policies.",
			"Cloudinary stores licensed public product photos only, not family data or recordings. Photos are delivered through CareBasket’s image optimizer. Open Prices and Open Food Facts supply public catalog data through developer-run imports; shopping requests are not sent to those sources. Receipt images and contributor information are not imported.",
		] },
	] as const,
	retentionTitle: "How long data stays",
	retentionIntro: "These are the project’s retention rules. Cleanup is developer-run maintenance, not an automatic scheduled service. Expired access is blocked even when the expired database row is still awaiting cleanup.",
	retention: [
		{ name: "Recordings", period: "Never stored." },
		{ name: "Private reviews", period: "Inaccessible after 30 minutes or earlier proof expiry; replaced on the next interpretation. Expired rows are deleted during maintenance." },
		{ name: "Pairing records", period: "Deleted 24 hours after expiry or completion." },
		{ name: "Revoked or expired devices", period: "Deleted 30 days after revocation or expiry." },
		{ name: "Request text or transcripts", period: "Cleared 90 days after a final request status; paid requests use the verified capture date." },
		{ name: "Requests, baskets and Sandbox payments", period: "Retained while the family exists. Minimal payment-event metadata may remain after profile deletion and needs separate operator review." },
		{ name: "Audit records and rate limits", period: "Audit records: 180 days. Rate-limit counters: until their window ends, then maintenance deletes them." },
		{ name: "Logs and backups", period: "Host logs follow the hosting provider’s configured retention. Deleted data may remain in Neon backups until the database’s configured restore window expires; deleting a live row does not erase every backup immediately." },
	] as const,
	deletionTitle: "Deletion and privacy requests",
	deletion: "Managers can delete a managed profile after confirmation. This revokes its devices and deletes its associated requests, baskets and payment records. Full family/account deletion is not available as a self-service screen. Contact the project owner to request it; the owner must verify authority and coordinate application data, retained event metadata and Clerk account deletion. No automatic deletion or response deadline is promised.",
	contact: "Privacy contact",
	email: "kajugadaniels@gmail.com",
	contactHint: "Describe the request without sending passwords, device codes, recordings, card details or other sensitive information. Do not use this prototype for real children’s information or real household data; privacy procedures and applicable legal requirements need review before a live service.",
	home: "Back to home",
} as const;
