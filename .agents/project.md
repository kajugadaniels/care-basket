# Project Definition and MVP Scope

**Purpose:** Define what CareBasket is, who it serves, and what is in and out of scope, so every change can be checked against the product's intent.
**Applies to:** Every task (scope check) and all product decisions.
**Related:** [hackathon.md](hackathon.md), [authentication.md](authentication.md), [payments.md](payments.md), [ai.md](ai.md), [accessibility.md](accessibility.md)
**Last reviewed:** 2026-10-08

---

## 1. Mission

CareBasket lets people who find online shopping hard ask for the essentials they need by speaking, typing, or tapping pictures. A trusted family member then reviews the request and pays securely with PayPal.

**Product philosophy:** Advanced technology behind the scenes. Exceptional simplicity for the person using it.

## 2. Target users and their difficulties

| User | Typical difficulties CareBasket must design for |
| --- | --- |
| **Assisted adults** (often older adults, or adults with limited technical experience) | Unfamiliar interfaces, small text and controls, passwords, multi-step checkouts, fear of "doing something wrong", sometimes reduced vision, hearing, dexterity, or memory. **Not all have any disability.** |
| **Supervised children** | Varying reading ability, limited spelling, no means of payment, need for adult oversight. **Reading ability varies widely by age and individual.** |
| **Family managers** (trusted adults) | Limited time, remote from the requester, need to see exactly what is requested and what it costs before paying. |

## 3. Roles

### 3.1 Family manager responsibilities

A family manager is an adult who signs in with Clerk. They:

- Create the family and remain accountable for it.
- Create, edit, and delete managed profiles, and confirm consent for each profile ([privacy.md § 2](privacy.md#2-consent)).
- Approve device pairing requests and revoke devices.
- Review requests, adjust or decline them, and decide whether to pay. Payment is always voluntary.
- Are the only people who can start checkout or approve a payment.

### 3.2 Managed profiles

Managed profiles have no Clerk account in the MVP. They use an authorized device with a restricted session ([authentication.md](authentication.md)).

| Product term | Internal `kind` | Notes |
| --- | --- | --- |
| Managed elderly profile / assisted adult | `ASSISTED_ADULT` | An adult who wants help. Treated as an adult with their own preferences. Future path: claim their own account ([authentication.md § 11](authentication.md#11-future-independent-adults-claiming-their-profile)). |
| Supervised child profile | `CHILD` | Always supervised. Requests always require manager review. Stricter privacy rules apply ([privacy.md § 6](privacy.md#6-children)). No Gemini AI while the compliance issue in [ai.md § 8](ai.md#8-profiles-children-and-tone) is open; children use pictures and simple typed matching. |

A managed profile can only create and follow its own shopping requests. It cannot see prices, other profiles, family settings, or payment controls.

## 4. Core user journeys

| # | Journey | Actor | Success looks like |
| --- | --- | --- | --- |
| J1 | Sign up and create a family | Manager | Signed in with Clerk; family created; lands on an empty, helpful family dashboard. |
| J2 | Add a managed profile | Manager | Profile created with a display name, kind, avatar, and confirmed consent. |
| J3 | Connect a device | Requester's device + manager | Device shows a short code; manager enters it, picks the profile, approves; device opens the requester's home screen. |
| J4 | Ask for groceries | Requester | Speaks, types, or taps pictures; sees what CareBasket understood as picture cards; adjusts if needed; sends to the manager by name. |
| J5 | Review the request | Manager | Sees items, quantities, catalog prices, total, and any substitutions or clarifications; can edit quantities, remove items, decline, or proceed to pay. |
| J6 | Pay with PayPal (Sandbox) | Manager | Starts checkout, approves in PayPal, server captures and verifies; request shows "Paid". |
| J7 | See confirmation | Requester | Sees a clear, friendly message: who paid and when, and separately, the delivery status. |
| J8 | Manage devices | Manager | Sees each paired device with its label and last use; can revoke any device instantly. |

## 5. MVP functionality

The MVP stays centered on exactly these eight capabilities:

1. Adult registration (Clerk)
2. Family profile management
3. Secure dependent-device pairing
4. Grocery requests using voice, text, or pictures
5. AI basket generation from a predefined catalog
6. Family request review
7. PayPal Sandbox payment
8. Clear payment confirmation, kept separate from fulfillment status

## 6. Explicitly excluded from the MVP

Do not build these without developer approval:

- Real merchant, grocery, or inventory integrations; real delivery or fulfillment
- Live (production) PayPal payments, refunds UI, saved or vaulted payment methods, subscriptions, Pay Later promotion
- Recurring or scheduled orders, budgets, spending limits, allowances
- Multiple merchants, multiple currencies (USD only), coupons, loyalty
- Open-ended AI chat, AI shopping outside the catalog, AI-initiated payments
- Email, SMS, or push notifications (in-app status only)
- Native mobile apps, offline mode, PWA installation flows
- Full localization (the MVP ships in English but stays localization-ready, see [accessibility.md § 9](accessibility.md#9-language-and-localization-readiness))
- Admin console for the catalog (the catalog is seeded)
- Independent adult account claiming (documented future path only)
- Analytics dashboards, charts, social sharing, reviews, product recommendations
- Storing audio recordings

## 7. Non-goals and scope boundaries

- CareBasket is **not** an escrow service. Ordinary PayPal checkout is a direct payment ([payments.md § 9](payments.md#9-claims-we-must-never-make)).
- CareBasket does **not** fulfil orders in the hackathon. A demonstration merchant with simulated products and simulated fulfillment is used, and this is disclosed everywhere.
- CareBasket does **not** make decisions on anyone's behalf. AI proposes; people confirm; only family managers pay.
- CareBasket is **not** a monitoring or surveillance tool. Managers see requests, not activity logs of the requester's device.

## 8. Minimizing user effort

These are product requirements, not aspirations:

- A requester never needs an account, email, or password.
- A requester can send a request **without typing** (voice or pictures) and with **at most three taps** after CareBasket shows what it understood.
- Every dependent-facing screen has **one main action**, at most three visible actions, and plain words.
- A requester never sees payment controls, card details, or technical errors.
- A manager can review and pay for a typical request in **under one minute** after opening it.
- Anything CareBasket can safely infer or remember (manager's name, profile, catalog matches) it does, so nobody types it twice.

## 9. Acceptance criteria for scope

A change is in scope when all are true:

- [ ] It directly supports one of the eight MVP capabilities in §5.
- [ ] It does not add anything from §6.
- [ ] It does not increase the number of steps or decisions for a requester.
- [ ] It is demonstrable within the hackathon timeline ([hackathon.md § 4](hackathon.md#4-project-timeline)).

When a request would expand scope, say so and ask before building it.
