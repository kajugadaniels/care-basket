# PayPal AI Hackathon 2026 Requirements

**Purpose:** Record the competition requirements that constrain CareBasket, with sources and verification status, so scope and submission decisions rest on facts.
**Applies to:** Scope decisions, demo planning, submission.
**Related:** [submission.md](submission.md), [project.md](project.md), [payments.md](payments.md), [ai.md](ai.md), [deployment.md § 7](deployment.md#7-demo-availability)
**Last reviewed:** 2026-10-08

---

## 1. Sources and verification status

| Source | URL | Accessed | Result |
| --- | --- | --- | --- |
| Official overview | https://paypalaihackathon.devpost.com/ | 2026-10-08 | **Not readable by agent tools** (HTTP 403 to automated requests) |
| Official rules | https://paypalaihackathon.devpost.com/rules | 2026-10-08 | **Not readable by agent tools** (HTTP 403) |
| Developer brief | Project kickoff instructions | 2026-10-08 | Requirements as stated by the developer |
| Secondary: DevGrants Daily | https://devgrantsdaily.com/items/2026-10-02-paypal-ai-hackathon-2026/ | 2026-10-08 | Summarizes the official rules page (published 2026-10-01) |
| Secondary: The GenAI Magazine | https://thegenaimagazine.com/paypal-ai-hackathon-2026-ideas-deadline-prizes | 2026-10-08 | Requirements, criteria, prizes |
| Secondary: Course Joiner | https://coursejoiner.com/hackathon/paypal-ai-hackathon-2026/ | 2026-10-08 | Requirements, deadline in GMT+5:30, prizes |

> **Action for the developer:** open the official rules page in a browser, confirm every row marked "Secondary" or "Brief" below, and update the Status column and this document's date. The official rules always win over this document.

Status legend: **Brief** = stated in the developer brief; **Secondary** = reported by at least one secondary source; **Brief + Secondary** = both agree; **Official** = confirmed by the developer on the official page.

## 2. Mandatory requirements

| Requirement | Status | How CareBasket meets it |
| --- | --- | --- |
| Meaningfully use at least one PayPal technology (API, SDK, product, or capability), using the free PayPal **Sandbox** | Brief + Secondary | PayPal Orders v2 create and capture, verified webhooks, and the PayPal JS SDK v6 ([payments.md](payments.md)) |
| Meaningfully use AI (any tool, model, or platform) in the core experience or backend | Brief + Secondary | Gemini interprets voice and text into catalog baskets ([ai.md](ai.md)) |
| **PayPal and AI both central** to the product | Brief | The core journey is AI basket → manager review → PayPal payment |
| A **working implementation**, not static mockups or wireframes | Brief + Secondary | Deployed demo with real Sandbox payments |
| A functional demo available to judges (hosted, or clear run instructions) | Brief + Secondary | Public HTTPS demo ([deployment.md](deployment.md)) |
| **Public repository** with the source code and setup instructions | Brief + Secondary | GitHub repository and README ([submission.md](submission.md)) |
| A complete **open-source license** file in the repository | Brief + Secondary | `LICENSE` file, not yet added ([§ 7](#7-open-decisions)) |
| Demo video **under three minutes**, **public on YouTube** | Brief + Secondary | [submission.md § 5](submission.md#5-demo-video) |
| Text description of features and tools used | Secondary | Devpost description ([submission.md § 7](submission.md#7-devpost-submission-fields)) |
| Submission materials in **English**, or with English translations | Brief | All materials in English |
| New or existing projects allowed if meaningful progress happens during the submission period | Secondary | The repository was created in October 2026, inside the period |

## 3. Dates

| Event | Date | Status |
| --- | --- | --- |
| Submission period opens | 2026-10-01, 9:00 AM Pacific | Secondary |
| **Submission deadline** | **2026-11-12, 12:00 PM Pacific Standard Time (20:00 UTC)** | Brief + Secondary (two sources) |
| Judging period | 2026-11-13 to 2026-12-15 (one source says 2026-12-01 to 2026-12-15) | Secondary |
| Winners announced | On or around 2026-12-21 | Secondary |

**Discrepancy:** one secondary source lists the deadline as 2:00 PM Pacific. The developer brief and two other sources say 12:00 PM (one as 2026-11-13 1:30 AM GMT+5:30, which equals noon PST). **Plan for 12:00 PM PST** until the official page is checked. Daylight saving time ends on 2026-11-01, so Pacific time on the deadline is PST (UTC−8).

## 4. Project timeline

Working back from the deadline, with a 24-hour buffer:

| Dates | Milestone |
| --- | --- |
| Oct 8 – Oct 14 | Rules (this rulebook), schema for identity and family, Clerk sign-in, family and profile management, design tokens and base UI components |
| Oct 15 – Oct 21 | Device pairing and device sessions; catalog seed; picture-based requests |
| Oct 22 – Oct 28 | AI text and voice interpretation; request submission; manager review |
| Oct 29 – Nov 4 | PayPal checkout, capture, webhooks; confirmation screens; simulated fulfillment |
| **Nov 5** | **Feature freeze** |
| Nov 5 – Nov 8 | Accessibility and responsive pass, bug fixes, demo deployment, privacy page, README, LICENSE |
| Nov 9 | Record and publish the video |
| Nov 10 | Complete the Devpost draft; run the full checklist in [submission.md](submission.md) |
| **Nov 11** | **Submit** (one day before the deadline) |
| Nov 12, 12:00 PM PST | Hard deadline |
| Nov 13 – about Dec 21 | Keep the demo available and stable |

Anything not done by feature freeze is cut, not rushed.

## 5. Judging criteria

Five criteria, **equally weighted** (Brief + Secondary):

| Criterion | What CareBasket should demonstrate |
| --- | --- |
| Technological implementation | Secure server-side PayPal capture and webhook verification, validated AI structured output, device pairing, family isolation |
| Design | Calm, accessible, responsive interfaces for two very different audiences |
| Potential impact | Independence for older adults and people with limited tech experience; less coordination burden for families |
| Innovation | Voice or pictures → AI catalog basket → trusted-adult PayPal payment, with no account needed for the requester |
| Presentation | A clear, under-three-minute story from the requester's request to confirmed payment |

## 6. Prizes (optional; separate from mandatory requirements)

Reported by secondary sources; confirm on the official page.

- **Main prizes:** 1st $12,000, 2nd $8,000, 3rd $5,000.
- **Special awards ($5,000 each):** Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI, Best Use of Agentic Commerce.
- **Sponsor prizes:** AG Grid, APIMatic, Bryntum, Channel3, Render (cash or credits; specific requirements not verified).
- Reported rule: one project can win one main prize or honorable mention plus one sponsor prize.

Rules for this project:

- **No sponsor tool is required** by the mandatory rules as known. Do not describe any sponsor tool as required.
- Do not adopt a sponsor tool (or change hosting to Render) to chase a prize without developer approval and a check that it does not expand scope.
- "Best Use of Agentic Commerce": CareBasket's AI builds the basket, but **a person always approves and pays**. Do not claim that AI makes payments or acts autonomously with money.

## 7. Open decisions

| Decision | Why it matters | Owner |
| --- | --- | --- |
| Confirm all requirements on the official rules page | Agent tools could not read it | Developer |
| Choose the open-source license (MIT is a simple, common choice) | Required for submission; affects dependency compatibility | Developer |
| Child profiles vs. Gemini's under-18 restriction | Gemini API terms prohibit apps likely to be accessed by people under 18 ([ai.md § 8](ai.md#8-profiles-children-and-tone)) | Developer |
| Hosting platform and demo domain | Affects Clerk production instance, webhooks, IP headers ([deployment.md § 6](deployment.md#6-platform-notes)) | Developer |
| Eligibility (age of majority, country exclusions reported by secondary sources) | Must be confirmed before investing further | Developer |

## 8. Acceptance criteria

- [ ] Every requirement in §2 is confirmed against the official rules, with Status updated.
- [ ] Both PayPal and AI are visibly central in the demo and video.
- [ ] Optional prize work never displaces mandatory requirements.
- [ ] Every external claim in this document keeps its source and date.
