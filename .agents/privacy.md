# Privacy

**Purpose:** Protect older adults, children, and family information by collecting as little as possible, being clear about consent and ownership, and deleting data on schedule.
**Applies to:** Any personal data, voice input, deletion, third-party processing, and anything shown in public demos.
**Related:** [security.md](security.md), [authentication.md § 5](authentication.md#5-managed-profiles-consent-and-ownership), [ai.md](ai.md), [database.md § 9](database.md#9-sensitive-data-deletion-and-retention), [submission.md](submission.md)
**Last reviewed:** 2026-10-08

---

## 1. Principles

1. **Collect the minimum.** If a feature works without a data point, do not collect it.
2. **Purpose-bound.** Data is used only for the shopping workflow it was collected for. No advertising, profiling, or selling.
3. **The family manager is accountable**, and the person a profile describes is respected as a person, not an asset.
4. **Short retention, real deletion.**
5. **Nothing real in public demos.**

## 2. Consent

- Creating a managed profile requires the adult's explicit confirmation that they are the parent or guardian, or that the person asked them to set it up ([authentication.md § 5](authentication.md#5-managed-profiles-consent-and-ownership)). Store `consentConfirmedAt` and `consentVersion`. Increase `consentVersion` when the wording changes materially.
- **AI processing for assisted adults** is off by default. The manager turns it on per profile and confirms that the person agrees to their requests being processed by Google's AI service. Store `aiConsentConfirmedAt` and `aiConsentVersion`; the requester sees a one-line notice wherever AI is used ([ai.md § 8.1](ai.md#81-assisted-adults)). Children's data is never sent to the AI provider.
- Microphone access is requested only when the user taps the microphone and is explained in plain words first ([ai.md § 7](ai.md#7-voice-input)).
- No cookies other than strictly necessary ones: Clerk's authentication cookies, the device session cookie, and the short-lived pairing cookie. No consent banner is needed for these; do not add tracking that would require one.
- A short, plain-language privacy page (`/privacy`) explains what is collected, why, who processes it, and how to delete it, before the public demo is shared.

## 3. Data inventory

| Data | Source | Purpose | Stored where |
| --- | --- | --- | --- |
| Adult email, name, sign-in credentials | Clerk | Authentication | Clerk only (CareBasket stores `clerkUserId`) |
| Adult display name for the family ("Anna", "Mom") | Adult | Shown to requesters ("Send to Anna") | `FamilyMembership.displayName` |
| Family name | Adult | Dashboard label | `Family` |
| Profile display name, kind, avatar preset, locale | Adult | Personalising the requester UI | `ManagedProfile` |
| Consent confirmation | Adult | Accountability | `ManagedProfile` |
| Device label, browser and OS summary, last use | Adult and device | Device management and revocation | `AuthorizedDevice` |
| Device token and pairing secrets | Generated | Authentication | Hashes only |
| Request text or transcript | Requester | Shows the manager what was asked | `ShoppingRequest.inputText` |
| Optional per-request budget | Requester | Budget-aware suggestions; context for the manager | `ShoppingRequest.budgetMinor` |
| AI consent confirmation (assisted adults) | Adult | Accountability for AI processing | `ManagedProfile` |
| Basket items and prices | Server | Review and payment | `ShoppingBasket`, `BasketItem` |
| PayPal order and capture IDs, amounts, statuses | PayPal | Payment verification | `Payment`, `PaymentEvent` |
| Voice audio | Requester | Transcription and interpretation | **Never stored** |
| Client IP | Request | Rate limiting | HMAC only, short-lived |
| Catalog products and price observations | Open Prices, Open Food Facts | Product catalog and reference prices | Catalog tables; contain **no personal data** |

Open Prices records include contributor usernames, comments, and proof images (receipts and price-tag photos). CareBasket **never stores, displays, or redistributes** them ([catalog.md § 10](catalog.md#10-licensing-and-attribution)).

Not collected in the MVP: dates of birth, ages, addresses, phone numbers, photos, payer names or emails, card data, location, contacts, health information.

## 4. Data minimization rules

- Profile names are a first name or nickname; the UI says so.
- Avatars are presets, not photos.
- Requester screens receive only what they display ([security.md § 4](security.md#4-least-privilege)).
- PayPal checkout uses `NO_SHIPPING`, so no address is requested ([payments.md § 3](payments.md#3-payment-workflow)).
- Logs contain no personal data ([security.md § 9](security.md#9-safe-errors-and-logging)).
- No third-party analytics, session replay, advertising, or tracking scripts.
- Product images and fonts are served from CareBasket's own domain (`public/products/`, `next/image`, `next/font`), so users' browsers make no requests to third-party hosts except PayPal and Clerk where needed.

## 5. AI and voice data

- Audio is processed in memory, sent to the AI provider for that single request, and discarded. It is never written to storage, logs, or caches.
- Prompts contain only the request text or audio, the catalog subset, `audience`, and `locale`. No names, ages, family data, or history ([ai.md § 8](ai.md#8-profiles-children-and-tone)).
- Google's Gemini API terms (https://ai.google.dev/gemini-api/terms, checked 2026-10-08) say that content sent through **unpaid** services may be used to improve Google products and may be read by human reviewers; **paid** services are not used that way. Therefore:
  - Hackathon development and demos use **only fictional test data**.
  - A billing-enabled (paid) Gemini API key is required before any real person's data is processed.
- The same terms prohibit use in applications directed to, or likely to be accessed by, people under 18. See the open issue and interim rule in [ai.md § 8](ai.md#8-profiles-children-and-tone).

## 6. Children

- Children never have accounts, emails, or passwords. A parent or guardian creates and controls the profile.
- Child profiles store only a display name, avatar preset, and locale.
- Child requests always go to an adult for review; children never see prices or payment controls.
- Child profiles make no Gemini calls while the compliance issue in [ai.md § 8](ai.md#8-profiles-children-and-tone) is open.
- No public display of anything a child entered.
- Before any real launch that includes children, obtain legal review of applicable children's privacy law (for example COPPA in the United States and age-appropriate design codes elsewhere). The MVP design keeps child data minimal so that compliance is feasible; it does not claim compliance.

## 7. Deletion and retention

| Data | Retention |
| --- | --- |
| Voice audio | Not stored |
| Pending, rejected, or expired pairings | Deleted 24 hours after expiry or completion |
| Revoked or expired devices | Deleted 30 days after revocation or expiry |
| `inputText` (typed text or transcript) | Cleared 90 days after the request reaches a final status |
| Requests, baskets, items | While the family exists (MVP) |
| Payments and payment events (Sandbox) | While the family exists (MVP). Define legal retention before any live payments. |
| Audit log | 180 days |
| Rate-limit counters | Deleted after their window ends |
| Server logs | Hosting provider default; contain no personal data |

Deletion rules:

- **Profile deletion:** revokes all its devices immediately and deletes its requests, baskets, items, and payment records in one transaction, after a confirmation dialog that explains this.
- **Family or account deletion (`OWNER`):** deletes the family and everything that cascades from it, then deletes the Clerk user ([authentication.md § 10](authentication.md#10-account-and-family-deletion)). The UI states that this cannot be undone.
- Deletion is a hard delete. Soft-delete flags are used only for catalog products.
- Database backups (Neon point-in-time restore) age out on Neon's schedule; the privacy page says so.
- Scheduled purges run as developer-executed maintenance until a scheduled job is approved ([architecture.md § 10](architecture.md#10-status-updates-without-background-infrastructure)).

## 8. Restricted access

- Access follows the permission matrix in [authentication.md § 9](authentication.md#9-server-side-permission-verification).
- Managers see requests and their contents, not device activity logs.
- Requester devices see only their own profile's requests.
- Nobody, including the developer acting as support, browses family data in production without a specific, logged reason.

## 9. Third-party processors

| Processor | Data it receives |
| --- | --- |
| Clerk | Adult identity and sign-in data |
| Neon | All CareBasket database data |
| PayPal | Order items and amounts; the payer's own PayPal data |
| Google (Gemini API) | Assisted adults' request text or audio and the catalog summary (no names, no children's data) |
| Hosting provider | Requests and server logs |

Open Prices and Open Food Facts are **data sources, not processors**: developer-run scripts read public data from them and send no user data.

Adding any processor (analytics, error reporting, email) needs developer approval and an update to this table and the privacy page.

## 10. Demos and public materials

- Use **fictional** people, names, and families in the app, screenshots, video, README, and Devpost text.
- Never use real children's names, faces, voices, or details. Voice demos use an adult volunteer or the developer.
- Use only PayPal **Sandbox** accounts. Never show or publish real financial credentials, real PayPal accounts, or card numbers.
- Do not show real email addresses on screen; use a demo account with a fictional address domain the developer controls.
- Disclose simulated fulfillment and test data ([payments.md § 9](payments.md#9-claims-we-must-never-make)).

## 11. Prohibited patterns

- Collecting data "for later"
- Storing audio, photos, dates of birth, or addresses
- Sending names or family data to the AI provider
- Third-party trackers or analytics on any page
- Real personal data, real children's information, or real financial credentials in demos, tests, fixtures, or seeds
- Soft-deleting personal data instead of deleting it

## 12. Acceptance criteria

- [ ] New fields are justified by a current feature and added to the inventory in §3.
- [ ] Retention and deletion behaviour for new data is defined in §7.
- [ ] Consent is captured before a profile exists.
- [ ] No personal data in logs, prompts, or public materials.
- [ ] The privacy page reflects the current inventory and processors before public demos.
