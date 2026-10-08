# Step 4 — Managed profiles handoff

## Summary

Implemented consent-based managed profiles for assisted adults and supervised children: family-scoped list, add, detail, edit, and permanent removal. The dashboard counts real profiles, navigation includes Family Members, and only device pairing, requests, and payments remain in the coming-next preview.

## Files

Updated:

- `prisma/schema.prisma` — profile model, enum, relations, indexes, and audit records.
- `src/features/family/copy.ts` — implemented member navigation and real profile-count wording.
- `src/features/family/components/FamilyNav/FamilyNav.tsx` — Family Members navigation and nested active state.
- `src/features/family/components/SetupPreview/SetupPreview.tsx` — remove profiles from unavailable features.
- `src/app/(manager)/family/layout.tsx` — Suspense around pathname-based navigation on dynamic routes.
- `src/app/(manager)/family/layout.test.tsx` — allow the implemented members route.
- `src/app/(manager)/family/page.module.css` — dashboard member action and readable instructions.
- `src/app/(manager)/family/page.tsx` — real profile count and add/view action.
- `src/app/(manager)/family/page.test.tsx` — dashboard counts, plural wording, and future-only preview.

Created:

- `src/features/profiles/presets.ts` — stable avatar keys, types, locale, consent version, page size.
- `src/features/profiles/copy.ts` — feature wording and safe validation/error messages.
- `src/features/profiles/types.ts` — minimal serializable DTOs and action result type.
- `src/features/profiles/schemas.ts` — strict create/edit/delete/lookup/list validation.
- `src/features/profiles/schemas.test.ts` — consent, name, kind, avatar, extra-field, and edit restrictions.
- `src/server/audit/write-profile-event.ts` — append-only profile events inside the mutation transaction.
- `src/features/profiles/server/repository.ts` — scoped reads, counts, pagination, atomic writes and audit.
- `src/features/profiles/server/repository.test.ts` — scoped queries, defaults, immutable fields, audit rollback.
- `src/features/profiles/server/service.ts` — manager permissions, consent timestamps, DTO mapping, CRUD.
- `src/features/profiles/server/service.test.ts` — authorization, cross-family failures, consent and pagination.
- `src/features/profiles/actions.ts` — authenticated actions, strict validation, safe errors, revalidation and redirects.
- `src/features/profiles/actions.test.ts` — authentication, authorization, validation, navigation and error safety.
- `src/lib/format.ts` — UTC date formatting with Intl.
- `src/lib/format.test.ts` — consistent creation date formatting.
- `src/features/profiles/components/ProfileAvatar/ProfileAvatar.module.css` — token-based preset avatar tile.
- `src/features/profiles/components/ProfileAvatar/ProfileAvatar.tsx` — individually imported Hugeicons presets.
- `src/features/profiles/components/ProfileCard/ProfileCard.module.css` — readable profile card layout.
- `src/features/profiles/components/ProfileCard/ProfileCard.tsx` — name, kind, avatar and detail link.
- `src/features/profiles/components/ProfileList/ProfileList.module.css` — one/two/three-column responsive grid.
- `src/features/profiles/components/ProfileList/ProfileList.tsx` — real profile list and helpful empty state.
- `src/features/profiles/components/ProfileList/ProfileList.test.tsx` — empty state and real card semantics.
- `src/features/profiles/components/ProfileChoices/ProfileChoices.module.css` — accessible selection surfaces.
- `src/features/profiles/components/ProfileChoices/ProfileChoices.tsx` — native type/avatar radio groups.
- `src/features/profiles/components/ProfileForm/ProfileForm.module.css` — responsive form, instructions and error states.
- `src/features/profiles/components/ProfileForm/ProfileForm.tsx` — preserved input, consent, pending state and immutable type.
- `src/features/profiles/components/ProfileForm/ProfileForm.test.tsx` — labels, choices, errors, loading and edit fields.
- `src/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog.module.css` — responsive native removal dialog.
- `src/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog.tsx` — explicit confirmation and safe removal.
- `src/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog.test.tsx` — confirmation, cancellation, focus return, errors and pending state.
- `src/features/family/components/FamilyNav/FamilyNav.test.tsx` — members active state across all nested routes.
- `src/app/(manager)/family/members/page.module.css` — route layouts and loading skeleton surfaces.
- `src/app/(manager)/family/members/loading.tsx` — Suspense boundary for all member pages.
- `src/app/(manager)/family/members/error.tsx` — safe route error, retry and family-overview exit.
- `src/app/(manager)/family/members/not-found.tsx` — shared missing/cross-family profile message.
- `src/app/(manager)/family/members/page.tsx` — authenticated list and validated continuation links.
- `src/app/(manager)/family/members/page.test.tsx` — list authentication, empty state and cursor validation.
- `src/app/(manager)/family/members/add/page.tsx` — authenticated profile creation route.
- `src/app/(manager)/family/members/[profileId]/page.tsx` — owned profile details and removal dialog.
- `src/app/(manager)/family/members/[profileId]/edit/page.tsx` — owned profile edit route.
- `src/app/(manager)/family/members/[profileId]/page.test.tsx` — add/detail/edit route guards and cross-family not-found behavior.
- `docs/step-4-managed-profiles.md` — this handoff and per-file manual commits.

## Model and decisions

`ManagedProfile` uses UUIDv7 IDs, an indexed `(familyId, id)` lookup, a 40-character display name, immutable `ProfileKind`, preset avatar key, and default `en-US` locale. It cascades from `Family`; its required creator relation to `User` uses `Restrict` so consent attribution is not orphaned. Family/account deletion must delete the family before the creator account, as the existing privacy policy requires.

Consent is unchecked initially and required by both the Server Action and service. Creation stores the server timestamp, version `2026-10-08`, and authenticated database user ID. AI assistance is explicitly false and both AI-consent fields are null. Editing changes only name and avatar; existing consent, ownership, timestamps, kind, and AI permissions remain intact.

Security rules require profile audit events. A minimal `AuditLog` table stores only opaque actor/target IDs, family association, event type, and timestamp. Each mutation and audit record shares an interactive transaction; audit failure rolls back the mutation. The Prisma Client reference skill informed these transaction and query choices. Audit retention remains 180 days under the existing developer-run maintenance policy; no scheduler or purge automation was added.

Every protected page and action calls `requireAdult()` with OWNER/MANAGER roles. Services re-check actor permissions. Reads, updates, deletes, continuation checks and counts derive family scope from that actor. Client profile IDs are lookup keys only. Cross-family IDs produce `NOT_FOUND`, and routes render the same not-found state as a missing profile.

Removal is a hard delete after a named, permanent-removal confirmation. Its transaction is the extension point for Step 5 device revocation; no device cleanup is claimed or implemented before devices exist. No future device, request, or payment models were added.

Names reuse the existing unsafe-character detector, including rejecting controls before whitespace normalization. Strict schemas reject ownership/AI/identity fields and ordinary attempts to change a child's type. Locale is fixed server-side, not exposed in the form. There are no uploads or identity/contact fields.

UI uses DM Sans, existing tokens, CSS Modules, native radio groups, labelled errors and a native modal dialog. Cards reflow from one to two to three columns; forms are capped at the reading width. The pathname navigation has its own Suspense boundary, and member pages sit beneath their loading boundary. Lists read at most 50 profiles at once and provide a family-scoped continuation when more exist.

## Not verified and remaining manual work

Code and tests were written and reviewed through source inspection only. Tests, lint, type checks, builds, browser flows, Prisma generation and migrations were not executed. No secrets were read and no Git writes were executed. The existing generated Prisma client does not yet contain the new models; regenerate it before checking types or running tests.

The proposed `add_managed_profiles` migration is additive: a profile table, enum, foreign keys/indexes, and audit table. No existing rows need a backfill, and no applied migration was edited. The developer must generate and review the actual migration; none was fabricated.

No unresolved product choices block this step. Database, browser and tooling behavior remain unverified until the manual checks below are completed.

## Browser checklist

1. Sign out and visit each list/add/detail/edit route; verify sign-in opens through the existing Clerk dialog flow. With an account lacking a family, verify the setup redirect.
2. With an empty family, verify a real zero count, one add action, and no fabricated profile cards.
3. Create fictional assisted-adult and child profiles. Verify unchecked consent, name validation, kind/avatar selection, saved detail links and updated counts.
4. Edit name and avatar. Verify kind is read-only, consent is not requested again, and errors preserve input.
5. Open a profile ID from another fictional family; verify list isolation and the same not-found response for detail/edit. Verify unauthorized mutation attempts change nothing.
6. Open removal. Verify the person's name, permanence explanation, unchecked confirmation, initial Cancel focus, Tab/Shift+Tab trapping, Escape closing, and focus returning to the trigger. Confirm removal and verify the list and dashboard count update.
7. Check 320px, 375px, 768px, 1024px and 1440px, 200% zoom, keyboard-only navigation, VoiceOver/TalkBack and forced colors. Verify no overflow and targets of at least 48px.
8. Verify pending labels, disabled repeated submissions, persistent safe errors and route retries. Verify only device connection, requests and payments remain unavailable.
9. If testing more than 50 fictional profiles, verify continuation links stay scoped to the family and disappear on the last page.
10. Review the generated migration locally before applying it elsewhere. Confirm no destructive statements and that profile mutations persist an audit event without names or personal text.

## Commands for the developer

Run the migration only against the local development Neon branch/database. These commands create/apply the migration and regenerate the client; there is no dependency installation.

```bash
npx prisma migrate dev --name add_managed_profiles --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run lint
npx tsc --noEmit
npx vitest run src/features/profiles src/features/family 'src/app/(manager)/family' src/lib/format.test.ts
npm run build
```

## Suggested commits — one file each, in dependency order

The migration glob below refers to the single migration file created by the preceding command. If Git identifies more than one matching file, substitute the actual generated path before staging. Existing generated Prisma Client output is ignored and must remain uncommitted.

```bash
```
