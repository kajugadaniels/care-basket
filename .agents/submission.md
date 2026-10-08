# Final Submission Checklist

**Purpose:** A single checklist that the developer completes before submitting CareBasket to the PayPal AI Hackathon 2026.
**Applies to:** The final two weeks before the deadline, and the submission itself.
**Related:** [hackathon.md](hackathon.md), [deployment.md](deployment.md), [privacy.md § 10](privacy.md#10-demos-and-public-materials), [payments.md § 9](payments.md#9-claims-we-must-never-make), [testing.md § 7](testing.md#7-critical-journeys-manual-end-to-end-script)
**Last reviewed:** 2026-10-09

---

Agents may draft README sections, the Devpost description, video scripts, and testing instructions when asked. The developer verifies, records, publishes, and submits.

## 1. Product works end to end

- [ ] Every step of the journey script in [testing.md § 7](testing.md#7-critical-journeys-manual-end-to-end-script) passes on the **deployed demo URL**.
- [ ] Works on a phone (iOS Safari and Android Chrome), a tablet, and a desktop browser.
- [ ] Keyboard-only and screen-reader passes completed ([accessibility.md § 12](accessibility.md#12-acceptance-criteria)).
- [ ] Lighthouse mobile meets [performance.md § 1](performance.md#1-targets) on the requester home and manager review pages.
- [ ] Every page has loading, empty, and error states; no developer error screens are visible.

## 2. PayPal (Sandbox) verified

- [ ] A Sandbox payment completes: order created on the server with server-computed amounts, approved in PayPal, captured and verified on the server.
- [ ] The transaction appears in the Sandbox business account with the correct items and total.
- [ ] Webhook deliveries succeed (2xx) and pass signature verification in the PayPal developer dashboard.
- [ ] Payment status shows only after server verification; delivery status is shown separately and labelled simulated.
- [ ] `PAYPAL_ENVIRONMENT=sandbox` in the demo; no live credentials anywhere.

## 3. AI is genuine and central

- [ ] Voice and typed requests are interpreted by Gemini into catalog items on the live demo (not hard-coded or mocked).
- [ ] Clarifications, substitutions, and "I didn't catch" are demonstrable.
- [ ] Picture selection works when voice is unavailable.
- [ ] The child-profile and Gemini terms decision is recorded ([hackathon.md § 7](hackathon.md#7-open-decisions)), and the demo complies with it.

## 4. Repository

- [ ] Public on GitHub.
- [ ] Contains all source code needed to run the project.
- [ ] `LICENSE` contains a complete open-source license (for example the full MIT text with year and copyright holder).
- [ ] `README.md` includes:
  - [ ] What CareBasket is and who it is for (two or three sentences)
  - [ ] How PayPal is used (Orders v2, capture, verified webhooks, JS SDK) and how AI is used (Gemini voice and text interpretation into catalog baskets)
  - [ ] Architecture overview and tech stack
  - [ ] Setup instructions: prerequisites (Node.js ≥ 20.9, npm, Neon, Clerk, PayPal Sandbox, Gemini API key), local and production environment templates, install, database migration and seed commands, run command
  - [ ] How to run tests
  - [ ] Demo URL and video link
  - [ ] Disclosures (see §8)
  - [ ] License, including the data licensing scopes: code (project license), `prisma/catalog/**` (ODbL 1.0), `public/products/**` (CC BY-SA 3.0, see `ATTRIBUTION.md`) ([catalog.md § 10](catalog.md#10-licensing-and-attribution))
- [ ] `.env.local.example` and `.env.production.example` are committed with safe defaults and placeholders only; no secrets in history (`git log -p` reviewed for keys).
- [ ] No real personal data in code, seeds, fixtures, or screenshots.

## 5. Demo video

- [ ] **Under three minutes** (target 2:45).
- [ ] Uploaded to **YouTube** with **Public** visibility, and the link works when signed out.
- [ ] In English, or with English subtitles. Captions are recommended for accessibility.
- [ ] Shows the real working product, not mockups.
- [ ] Suggested structure:
  1. The problem and who it is for (~15 s)
  2. The requester asks by voice; CareBasket shows what it understood as pictures (~45 s)
  3. The manager reviews items and the server-calculated total (~25 s)
  4. PayPal Sandbox payment and verified confirmation (~40 s)
  5. The requester sees "paid" separately from "delivery (demo)" (~20 s)
  6. How PayPal and AI work under the hood, and the safety design (~20 s)
  7. Impact and close (~10 s)
- [ ] Uses fictional people and data; no real children; no real credentials or emails on screen ([privacy.md § 10](privacy.md#10-demos-and-public-materials)).
- [ ] States that payments use PayPal Sandbox and fulfillment is simulated.

## 6. Judge testing instructions

- [ ] Demo URL, and a two-window walkthrough (manager window plus a private window as the requester's device), in plain steps.
- [ ] Judges create their own manager account through sign-up, so no adult credentials are shared.
- [ ] A **dedicated PayPal Sandbox personal (buyer) account** created only for judging, with a unique password used nowhere else. Its credentials go **only** in the Devpost testing-instructions field (judge-facing), **never** in the repository or README, and are clearly labelled "Sandbox, no real money".
- [ ] No live credentials, real PayPal accounts, card numbers, or private financial information anywhere in public instructions.
- [ ] A note on expected first-load delay if the database was idle.
- [ ] After judging, the developer disables or rotates the Sandbox judge account.

## 7. Devpost submission fields

Confirm the exact fields in the Devpost form. Typical fields:

- [ ] Project name and tagline
- [ ] Description: inspiration, what it does, how it was built, challenges, accomplishments, what was learned, what's next
- [ ] "Built with" technologies (Next.js, React, TypeScript, PayPal Orders API, PayPal JS SDK, Gemini, Clerk, Neon, Prisma)
- [ ] Repository URL
- [ ] Demo URL
- [ ] YouTube video URL
- [ ] Testing instructions (§6)
- [ ] Screenshots (fictional data only)
- [ ] Any required questions or prize-category selections (sponsor prizes are optional, [hackathon.md § 6](hackathon.md#6-prizes-optional-separate-from-mandatory-requirements))
- [ ] All text in English

## 8. Required disclosures

These appear in the README, the Devpost description, the video, and an in-app demo banner:

- [ ] Payments use **PayPal Sandbox** test accounts; no real money moves.
- [ ] Product data comes from **Open Food Facts and Open Prices** (ODbL, images CC BY-SA 3.0) plus CareBasket-curated items; it is sold by a **simulated demonstration merchant** (CareBasket Demo Market) at **demo prices**. No real stores are integrated, and Open Prices observations are historical reference data, not checkout prices ([catalog.md § 6](catalog.md#6-observed-prices-vs-demo-merchant-prices)).
- [ ] CareBasket is an independent project, not affiliated with or endorsed by PayPal.
- [ ] Delivery and fulfillment are **simulated**.
- [ ] All people and data shown are **fictional test data**.
- [ ] CareBasket is not an escrow service ([payments.md § 9](payments.md#9-claims-we-must-never-make)).

## 9. Availability during judging

- [ ] Demo stays up through about 2026-12-21 ([deployment.md § 7](deployment.md#7-demo-availability)).
- [ ] No risky deploys, key rotations, or webhook changes during judging.
- [ ] Weekly journey check completed during judging.

## 10. Final day

- [ ] Official rules re-read; [hackathon.md](hackathon.md) statuses confirmed.
- [ ] Submit by **2026-11-11** (buffer); hard deadline **2026-11-12 12:00 PM PST**.
- [ ] After submitting, open the Devpost page signed out and check every link (repository, demo, video).
