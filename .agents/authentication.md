# Authentication, Profiles, and Device Sessions

**Purpose:** Define how adults sign in with Clerk, how managed profiles get restricted access through securely paired devices, and how every request is authorized on the server.
**Applies to:** Sign-in, onboarding, families, profiles, devices, sessions, permissions.
**Related:** [security.md](security.md), [privacy.md](privacy.md), [database.md § 5](database.md#5-planned-models), [api.md](api.md)
**Last reviewed:** 2026-10-08

---

## 1. Two kinds of actors

| Actor | Who | Authenticated by | Can |
| --- | --- | --- | --- |
| **Adult** | Family manager | Clerk session | Manage the family, profiles, and devices; review requests; pay |
| **Device** | A managed profile on an authorized device | CareBasket device session (database-backed opaque token in an HttpOnly cookie) | Create and follow its own shopping requests only |

There is no third kind. Anonymous visitors can only see public pages, sign in or up, and start device pairing at `/connect`.

## 2. Adult onboarding

1. Sign up or sign in with Clerk's prebuilt components at `/sign-up` and `/sign-in` (optional catch-all routes, per Clerk's Next.js docs).
2. On the first authenticated server call, `ensureUser()` in `src/server/auth/` upserts a `User` row keyed by `clerkUserId`. No Clerk webhook is required for the MVP.
3. If the adult has no family, they are sent to `/family/setup`: family name, and "What should your family call you?" (stored as the membership `displayName`, for example "Mom" or "Anna"). Family and `OWNER` membership are created in one transaction.
4. They land on the family dashboard, whose empty state invites them to add a family member.

MVP constraints:

- An adult belongs to **at most one family** (unique `FamilyMembership.userId`). Supporting several families later requires a family switcher and a migration.
- The creator is the `OWNER`. The `MANAGER` role exists in the schema for a later "invite another adult" feature; the MVP does not build invitations. Permission checks use role helpers so adding managers later changes no call sites.

## 3. Clerk sign-in and sessions

- Use current `@clerk/nextjs` v7 APIs. Read the package README and types in `node_modules/@clerk/nextjs` before implementing; installed docs win over memory.
- `src/proxy.ts` exports `clerkMiddleware()` from `@clerk/nextjs/server`, with `createRouteMatcher` protecting `/family(.*)`. Do **not** create `middleware.ts`; Next.js 16 uses `proxy.ts`.
- `proxy.ts` is a convenience redirect, not authorization. Every Server Action, Route Handler, and data read calls `requireAdult()` again ([§ 9](#9-server-side-permission-verification)).
- Server code reads the Clerk session with `auth()` from `@clerk/nextjs/server`. Because `cacheComponents` is enabled, components that call it render inside `<Suspense>` ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)). Verify the `ClerkProvider` placement against Clerk's current App Router and Cache Components guidance.
- Clerk manages adult session lifetime, sign-out, and "sign out of all devices". CareBasket never stores Clerk tokens.
- Clerk UI components load only on adult and auth routes where possible, to keep requester bundles small ([performance.md § 3](performance.md#3-client-javascript-budget)).

## 4. Family creation and ownership

- A family is created only by an authenticated adult, who becomes its `OWNER`.
- Family-owned records (profiles, devices, requests, baskets, payments, audit entries) carry `familyId`, and every query filters by the actor's `familyId` ([security.md § 3](security.md#3-family-isolation-and-object-ownership)).
- Only the `OWNER` can delete the family. Deletion follows [privacy.md § 7](privacy.md#7-deletion-and-retention).

## 5. Managed profiles, consent, and ownership

- Only adults with `OWNER` or `MANAGER` roles create, edit, or delete managed profiles.
- Required fields: display name (a first name or nickname, up to 40 characters), `kind` (`ASSISTED_ADULT` or `CHILD`), and an avatar chosen from presets (no photo uploads in the MVP).
- **Consent:** creation requires the adult to confirm, in plain words, "I am this person's parent or guardian, or they have asked me to set this up for them." Store `consentConfirmedAt`, `consentVersion`, and `createdByUserId`. No profile exists without this confirmation.
- The family owns the profile; the profile does not own its own account in the MVP ([§ 11](#11-future-independent-adults-claiming-their-profile)).
- Deleting a profile revokes all its devices immediately and deletes its data as described in [privacy.md § 7](privacy.md#7-deletion-and-retention). The adult sees a confirmation dialog that explains this.

## 6. Child supervision

- `CHILD` profiles can only create requests. Every request is reviewed by a manager; there is no auto-approval for anyone in the MVP.
- Child devices see no prices, no payment status beyond "paid" or "not paid yet", and no family information beyond the manager's display name.
- AI handling for children follows [ai.md § 8](ai.md#8-profiles-children-and-tone), and data handling follows [privacy.md § 6](privacy.md#6-children).

## 7. Secure device pairing

Pairing binds one browser to one managed profile. It is **device-initiated and adult-approved**, so a code alone is worthless without both the device's own cookie and an authenticated adult's approval.

### 7.1 Flow

1. **Device starts.** The requester (or a helper) opens `/connect` on the device and taps "Connect this device". The server:
   - creates a `DevicePairing` row with status `PENDING`, expiry **10 minutes**, a **6-digit code**, and a random 32-byte **pairing secret**;
   - sets the secret in an HttpOnly cookie (`cb_pairing`, `__Host-cb_pairing` in production) on that device;
   - stores only `HMAC-SHA256(code, DEVICE_AUTH_SECRET)` and `SHA-256(secret)`.
2. **Device shows the code** in very large digits, grouped as `472 918`, with "Ask {your family member} to type this code in CareBasket." The code can be read aloud over the phone.
3. **Adult enters the code** at `/family/devices/connect` while signed in. The server finds a single `PENDING`, unexpired pairing matching the code hash.
4. **Adult confirms** on a review screen that shows the device summary (for example "Safari on iPad"), when it was requested ("2 minutes ago"), a profile picker, and an editable device label ("Grandma's iPad"). The adult chooses **Approve** or **Reject**. The pairing becomes `APPROVED` with `familyId`, `profileId`, and `approvedByUserId`, or `REJECTED`.
5. **Device completes.** The device polls `GET /api/pairing/status` (which reads its pairing cookie and returns status only). When approved, the device calls a POST completion action, which verifies the pairing-secret cookie against the stored hash and then, in one transaction:
   - creates an `AuthorizedDevice` with a new session token (stored as a SHA-256 hash only);
   - marks the pairing `COMPLETED` using a conditional update from `APPROVED`, so it can only complete once;
   - writes an audit entry.
   It then sets the device session cookie, clears the pairing cookie, and redirects to `/shop`.

### 7.2 Code rules

- Codes come from `crypto.randomInt(0, 1_000_000)`, zero-padded to six digits, and are unique among active pending pairings.
- A code is single-use, expires after 10 minutes, and is never logged or shown to anyone except on the requesting device.
- An expired or rejected pairing shows "This code has run out. Get a new code." with one button.
- Brute-force protection follows [security.md § 8](security.md#8-rate-limiting-and-brute-force-protection).

### 7.3 Prohibited pairing designs

- Public family links, or links that grant access by possession alone
- Granting access because someone knows a person's name, email, or family name
- Adult-generated codes that a device redeems without a later adult approval
- QR codes or magic links that skip the adult review step
- Long-lived or reusable codes

## 8. Device sessions

| Property | Rule |
| --- | --- |
| Token | 32 random bytes from `crypto.randomBytes`, base64url; stored only as a SHA-256 hash (`tokenHash`, unique) |
| Cookie | `cb_device` (development) / `__Host-cb_device` (production); `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`, no `Domain` |
| Validation | Every device request looks up the hash, then checks `revokedAt IS NULL`, `expiresAt > now`, idle limit, and that the profile still exists |
| Absolute lifetime | 180 days from pairing, then re-pairing is required |
| Idle timeout | 30 days without use |
| Activity tracking | `lastSeenAt` updated at most once per hour per device |
| Scope | One profile, one family; device actions are limited to the permission matrix in §9 |
| Limit | At most 5 active devices per profile |

- Sessions are database-backed opaque tokens, **not JWTs**, so revocation takes effect on the very next request.
- **Revocation:** managers see each device's label, browser summary, paired date, and last use at `/family/devices`, and can revoke any device instantly. Deleting a profile revokes all its devices.
- **Multiple devices:** a profile may have several authorized devices (for example, a tablet and a phone); each is paired and revoked independently.
- **Recovery:** if the cookie is missing, expired, or revoked, the device shows "This device needs to be connected again. Ask {manager display name} for help." with a single "Connect again" button. No data is lost; requests stay with the profile. A device record whose cookie was lost stays listed until it expires or is revoked.
- The device session cookie is never readable by JavaScript, never placed in URLs, and never sent to third parties.

## 9. Server-side permission verification

All authorization lives in `src/server/auth/`:

- `getActor()` resolves the current actor from either the Clerk session or the device cookie. If both are present, routes declare which actor they accept; adult routes ignore device cookies and device routes ignore Clerk sessions.
- `requireAdult({ roles? })` and `requireDevice()` throw `AppError('UNAUTHENTICATED' | 'FORBIDDEN')`.
- Ownership checks (`assertRequestInFamily`, `assertRequestOwnedByProfile`, …) load the object with the actor's `familyId` in the query and throw `NOT_FOUND` when absent.

| Capability | Adult `OWNER` | Adult `MANAGER` | Device (`ASSISTED_ADULT`) | Device (`CHILD`) |
| --- | :-: | :-: | :-: | :-: |
| Rename the family | ✓ | ✓ | — | — |
| Delete the family | ✓ | — | — | — |
| Create, edit, or delete managed profiles | ✓ | ✓ | — | — |
| Approve or reject pairing; revoke devices | ✓ | ✓ | — | — |
| View all family requests | ✓ | ✓ | — | — |
| Create a request (own profile only) | — | — | ✓ | ✓ |
| View own requests and their status | — | — | ✓ | ✓ |
| Cancel own request before review | — | — | ✓ | ✓ |
| Edit a basket during review, decline a request | ✓ | ✓ | — | — |
| Start checkout, capture payment | ✓ | ✓ | — | — |
| See prices and totals | ✓ | ✓ | — | — |

Any capability not in this table is denied by default.

## 10. Account and family deletion

- An adult deletes their account from account settings. The server deletes CareBasket data first, as described in [privacy.md § 7](privacy.md#7-deletion-and-retention), and then deletes the Clerk user through the Clerk Backend API.
- If the account is deleted in Clerk directly, the orphaned data must still be removed. Adopting the Clerk `user.deleted` webhook (verified with `verifyWebhook` from `@clerk/nextjs/webhooks`) is the recommended follow-up and needs developer approval for the extra environment variable.

## 11. Future: independent adults claiming their profile

Not in the MVP. The schema must not prevent it:

1. A manager invites an `ASSISTED_ADULT` profile holder to create their own Clerk account.
2. The person signs up; the manager and the person both confirm the link.
3. The profile becomes linked to the new `User`, who gains control of their own data and can choose what the family manager may still see or approve.

Do not add claim-related columns or flows until this feature is approved.

## 12. Acceptance criteria

- [ ] `src/proxy.ts` (not `middleware.ts`) protects `/family(.*)` with Clerk, and every adult entry point still calls `requireAdult()`.
- [ ] Every device entry point calls `requireDevice()` and scopes reads and writes to the device's own profile.
- [ ] Pairing needs the device's pairing cookie **and** an authenticated adult's approval; codes are single-use, hashed, short-lived, and rate-limited.
- [ ] Session tokens and codes are stored only as hashes and never logged.
- [ ] Revoking a device blocks its next request.
- [ ] Tests cover each row of the permission matrix in §9 ([testing.md § 4](testing.md#4-required-test-suites)).
