# Authentication, Profiles, and Device Sessions

**Purpose:** Define how adults sign in with Clerk, how managed profiles get restricted access through securely paired devices, and how every request is authorized on the server.
**Applies to:** Sign-in, onboarding, families, profiles, devices, sessions, permissions.
**Related:** [security.md](security.md), [privacy.md](privacy.md), [database.md § 5](database.md#5-planned-models), [api.md](api.md)
**Last reviewed:** 2026-10-09

---

## 1. Two kinds of actors

| Actor | Who | Authenticated by | Can |
| --- | --- | --- | --- |
| **Adult** | Family manager | Clerk session | Manage the family, profiles, and devices; review requests; pay |
| **Device** | A managed profile on an authorized device | CareBasket device session (database-backed opaque token in an HttpOnly cookie) | Create and follow its own shopping requests only |

There is no third kind. Anonymous visitors can only see public pages, sign in or up, and start device pairing at `/connect`.

## 2. Adult onboarding

1. Sign up or sign in through Clerk's prebuilt **dialogs**, opened from the public header ("Sign In", "Get Started"). There are no sign-in or sign-up pages (developer decision, 2026-10-08).
2. On the first authenticated server call, `ensureUser()` (`src/server/auth/ensure-user.ts`) finds or creates the `User` row keyed by `clerkUserId`. It reads first and, if a simultaneous request wins the insert race, uses the winner's row. No Clerk webhook is required for the MVP, and nothing but the Clerk user ID is stored.
3. If the adult has no family, `requireAdult()` sends them to `/family/setup`: family name, and "Your display name" (stored as the membership `displayName`, for example "Mom" or "Jane", prefilled from the Clerk first name). `createFamilyAction` creates the family and the `OWNER` membership in one transaction. Repeated or concurrent submissions resolve to the existing family, which is never renamed or overwritten. A family is never created without this form being submitted.
4. `/family/setup` redirects adults who already have a family to `/family`, and `/family` redirects adults without one to `/family/setup`.
4. They land on the family dashboard, whose empty state invites them to add a family member.

MVP constraints:

- An adult belongs to **at most one family** (unique `FamilyMembership.userId`). Supporting several families later requires a family switcher and a migration.
- The creator is the `OWNER`. The `MANAGER` role exists in the schema for a later "invite another adult" feature; the MVP does not build invitations. Permission checks use role helpers so adding managers later changes no call sites.

## 3. Clerk sign-in and sessions

- Use current `@clerk/nextjs` v7 APIs. Read the package README and types in `node_modules/@clerk/nextjs` before implementing; installed docs win over memory.
- `src/proxy.ts` exports `clerkMiddleware()` from `@clerk/nextjs/server` with Clerk's documented matcher, so `auth()` works in server code. It contains **no route-based protection**: `createRouteMatcher()` is deprecated in Clerk 7, because path matching can diverge from how Next.js routes requests. Do **not** create `middleware.ts`; Next.js 16 uses `proxy.ts`.
- **Resource-level protection:** every protected `page`, Server Action, and Route Handler verifies the session itself. Family-owned pages, actions, and handlers call `requireAdult()`; `/family/setup` and `createFamilyAction` call `ensureUser()`, because the adult has no family yet ([§ 9](#9-server-side-permission-verification)). Layouts alone are never enough, because they do not re-render on every navigation.
- `ClerkProvider` wraps the app inside `<body>` in the root layout, **without** the `dynamic` prop, so pages keep their static shell. Server code reads the session with `auth()` from `@clerk/nextjs/server`; with `cacheComponents` enabled, anything that reads it (including the server `<Show>` component) renders inside `<Suspense>` or below a `loading.tsx` ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)).
- `SignedIn`, `SignedOut`, and `Protect` were removed in Clerk Core 3. Use `<Show when="signed-in">` / `<Show when="signed-out">` for visibility only; it never replaces a server-side check.
- **Sign-in and sign-up open as Clerk dialogs, never as pages.**
  - The header uses `SignInButton` and `SignUpButton` with `mode="modal"`, wrapping real `<button>` elements. Shared options live in `src/lib/clerk/auth-dialogs.ts`: the sign-in dialog uses `withSignUp`, so a new adult can create an account inside it, and both dialogs fall back to `/family`.
  - Clerk still navigates to its configured sign-in and sign-up URLs in some cases, for example `redirectToSignIn()` from a protected page or a link inside a dialog. `/sign-in` and `/sign-up` are therefore Route Handlers, not pages. They redirect to the fixed paths `/?auth=sign-in` and `/?auth=sign-up`, where `AuthDialogOpener` opens the matching dialog, or sends a signed-in adult to `/family`.
  - The handlers ignore every query parameter, so they cannot become open redirects. A deep link's `redirect_url` is therefore not preserved; adults land on `/family`.
  - Redirects use Clerk's environment variables (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`). Without the URL variables, Clerk falls back to its hosted pages.
- Clerk manages adult session lifetime, sign-out, and "sign out of all devices". CareBasket never stores Clerk tokens.
- Clerk UI components load only on adult and auth routes where possible, to keep requester bundles small ([performance.md § 5](performance.md#5-client-javascript-budget)).

## 4. Family creation and ownership

- A family is created only by an authenticated adult, who becomes its `OWNER`.
- Family-owned records (profiles, devices, requests, baskets, payments, audit entries) carry `familyId`, and every query filters by the actor's `familyId` ([security.md § 3](security.md#3-family-isolation-and-object-ownership)).
- Only the `OWNER` can delete the family. Deletion follows [privacy.md § 7](privacy.md#7-deletion-and-retention).

## 5. Managed profiles, consent, and ownership

- Only adults with `OWNER` or `MANAGER` roles create, edit, or delete managed profiles.
- Required fields: display name (a first name or nickname, up to 40 characters), `kind` (`ASSISTED_ADULT` or `CHILD`), and an avatar chosen from presets (no photo uploads in the MVP).
- **Consent:** creation requires the adult to confirm, in plain words, "I am this person's parent or guardian, or they have asked me to set this up for them." Store `consentConfirmedAt`, `consentVersion`, and `createdByUserId`. No profile exists without this confirmation.
- **AI assistance** (voice and smart suggestions) is a separate, off-by-default setting for `ASSISTED_ADULT` profiles, enabled only with the AI consent described in [ai.md § 8.1](ai.md#81-assisted-adults). It is unavailable for `CHILD` profiles.
- The family owns the profile; the profile does not own its own account in the MVP ([§ 11](#11-future-independent-adults-claiming-their-profile)).
- Deleting a profile revokes all its devices immediately and deletes its data as described in [privacy.md § 7](privacy.md#7-deletion-and-retention). The adult sees a confirmation dialog that explains this.

## 6. Child supervision

- `CHILD` profiles can only create requests. Every request is reviewed by a manager; there is no auto-approval for anyone in the MVP.
- Child devices see no prices or budgets, no payment status beyond "paid" or "not paid yet", and no family information beyond the manager's display name.
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

- Adult helpers, from the session outward (implemented in Step 3):
  - `requireClerkUserId()` and `requireAuthenticatedUser()` (`require-authenticated-user.ts`) verify the Clerk session only. The second also loads the first name.
  - `ensureUser()` (`ensure-user.ts`) adds the database `User`.
  - `requireAdult({ roles? })` (`require-adult.ts`) resolves `{ type: "adult", userId, familyId, role }` from the session and `FamilyMembership` alone, and takes no IDs from callers. It redirects to sign-in without a session, redirects to `/family/setup` without a family, and throws `AppError("FORBIDDEN")` for a disallowed role.
  - The membership lookup (`family-membership.ts`) is deduplicated per request with React `cache()`, never in a shared cache.
- `getActor()` (with device sessions, later) resolves the current actor from either the Clerk session or the device cookie. If both are present, routes declare which actor they accept; adult routes ignore device cookies and device routes ignore Clerk sessions. `requireDevice()` follows the same rules as `requireAdult()`.
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
| See item prices and basket totals | ✓ | ✓ | — | — |
| See the estimated total against a budget they set for that request | — | — | ✓ | — |
| Turn AI assistance on or off for a profile (with consent) | ✓ | ✓ | — | — |

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

- [ ] `src/proxy.ts` (not `middleware.ts`) runs `clerkMiddleware()` without route matching, and every adult page, Server Action, and Route Handler verifies the session itself (`requireAdult()` for family-owned resources, `ensureUser()` for family setup).
- [ ] Every device entry point calls `requireDevice()` and scopes reads and writes to the device's own profile.
- [ ] Pairing needs the device's pairing cookie **and** an authenticated adult's approval; codes are single-use, hashed, short-lived, and rate-limited.
- [ ] Session tokens and codes are stored only as hashes and never logged.
- [ ] Revoking a device blocks its next request.
- [ ] Tests cover each row of the permission matrix in §9 ([testing.md § 4](testing.md#4-required-test-suites)).
