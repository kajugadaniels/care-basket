# Deployment and Environments

**Purpose:** Define what a deployable, demo-ready CareBasket needs: environments, variables, migrations, third-party configuration, HTTPS, webhooks, error reporting, and demo availability.
**Applies to:** Configuration, release preparation, and the public demo.
**Related:** [security.md § 10](security.md#10-secret-management), [database.md § 7](database.md#7-migrations), [payments.md § 6](payments.md#6-webhooks), [hackathon.md](hackathon.md), [submission.md](submission.md)
**Last reviewed:** 2026-10-09

---

## 1. Agent rules

- Agents **never deploy**, run hosting CLIs, register webhooks, change provider dashboards, or run migrations ([workflow.md § 1.1](workflow.md#11-agents-must-not-execute)).
- When explicitly asked, agents may prepare configuration files (`next.config.ts` headers, `.env.local.example`, `.env.production.example`) and deployment documentation, and give the developer exact steps.

## 2. Environments

| Environment | Purpose | Database | PayPal | Clerk |
| --- | --- | --- | --- | --- |
| **Local** | Development on the developer's machine | Neon development branch | Sandbox | Development instance |
| **Preview** *(optional)* | Testing a branch before merging | Neon preview branch or the development branch | Sandbox | Development instance |
| **Demo** | Public hackathon demo for judges | Dedicated Neon branch or database | **Sandbox** | See §5.2 |

- Environments never share a database branch with the public demo.
- There is no live-payments environment in the hackathon scope ([payments.md § 2](payments.md#2-environment-and-sdks)).
- Each environment has its own secrets, set in that environment's configuration, never copied between environments through the repository.

## 3. Environment variables

Validated with Zod by `src/lib/env/server.ts` on first use (it covers `DATABASE_URL` and managed-device variables today; a `client.ts` counterpart arrives when the app reads public variables). Missing or malformed values fail fast with a clear message naming the variable (never its value). Next.js loads `.env.local` during local development and `.env.production` in a production environment, following its documented precedence. The Prisma CLI reads `.env.local` by default or `.env.production` when `NODE_ENV=production`; shell variables win in both modes.

| Variable | Exposure | Purpose | Template status |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical origin for Origin checks and absolute URLs | Both; production domain required |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk frontend | Both; environment-specific value required |
| `CLERK_SECRET_KEY` | Server | Clerk backend | Both; environment-specific secret required |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Public | `/sign-in`, a redirect route that opens the sign-in dialog (not a page) | Both; fixed default |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | `/sign-up`, a redirect route that opens the sign-up dialog (not a page) | Both; fixed default |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Public | `/family` (used when no valid `redirect_url` is present) | Both; fixed default |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Public | `/family` | Both; fixed default |
| `DATABASE_URL` | Server | Neon **pooled** connection for runtime queries | Both; separate database required |
| `DIRECT_URL` | Server / CLI | Neon **direct** connection for migrations ([database.md § 2](database.md#2-prisma-7-configuration)) | Both; separate database required |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public | PayPal JS SDK (same Sandbox app as below) | Both; Sandbox value required when enabled |
| `PAYPAL_CLIENT_ID` | Server | PayPal REST OAuth | Both; Sandbox value required when enabled |
| `PAYPAL_CLIENT_SECRET` | Server | PayPal REST OAuth | Both; Sandbox secret required when enabled |
| `PAYPAL_WEBHOOK_ID` | Server | Webhook signature verification | Both; environment-specific value required when enabled |
| `PAYPAL_ENVIRONMENT` | Server | Must be `sandbox` | Both; fixed to `sandbox` |
| `GEMINI_API_KEY` | Server | Gemini API | Both; environment-specific secret required when enabled |
| `GEMINI_MODEL` | Server | Gemini model ID ([ai.md § 4](ai.md#4-provider-abstraction)) | Both; approved model required when enabled |
| `DEVICE_AUTH_SECRET` | Server | HMAC key for pairing codes and IP hashing; at least 32 random bytes | Both; separate secret required |
| `DEVICE_IP_SOURCE` | Server | Trusted source for pairing-start IP rate limits | Both; local is `unconfigured`, production fails closed until reviewed |
| `DEMO_FULFILLMENT_CONTROLS` | Server | `true` shows simulated delivery controls ([payments.md § 10](payments.md#10-demonstration-merchant-and-fulfillment)) | Both; fixed to `true` |
| `CATALOG_USER_AGENT` | Scripts only | `CareBasket/<version> (<contact email>)` for Open Prices and Open Food Facts requests ([catalog.md § 8](catalog.md#8-curation-and-import-pipeline)); not needed by the deployed app | Both; required only when importer exists |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Server | Only if the Clerk deletion webhook is approved | Both; optional until approved |

Rules:

- Only the `NEXT_PUBLIC_*` values above may be public: the Clerk publishable key and route paths, the PayPal client ID, and the app URL. Any other public variable needs a security review.
- `.env.local.example` and `.env.production.example` list the same variables in the same order, with safe environment-specific defaults and placeholders. `.gitignore` allows only those two templates.
- Copy the local template to `.env.local`. Use `.env.production` only in a private production environment; hosted deployments SHOULD use their encrypted environment settings instead of copying a secret file.
- Next.js gives `.env.local` precedence over `.env.production`. Do not leave a local secret file in a production build/deployment context; hosted environment variables or a clean production checkout take precedence safely.
- For production Prisma operations backed by a private `.env.production`, explicitly use `NODE_ENV=production npx prisma migrate deploy --config prisma7.config.ts`. Never use `migrate dev`, `db push`, or reset against production.
- Clerk's deprecated `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` are not used. If the Clerk URL variables are missing, Clerk falls back to its hosted pages.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is needed only when self-hosting several instances behind a load balancer.

## 4. Database migrations

- Before deploying code that depends on a schema change, the developer applies migrations to the target database: `npx prisma migrate deploy --config prisma7.config.ts` with that environment's `DIRECT_URL`.
- Never run `migrate dev`, `db push`, or `migrate reset` against the demo database.
- Seed the demo catalog once with the developer-run seed command; reseeding is idempotent.
- Back-compatible changes first (expand, then contract) so the running demo never breaks mid-deploy.

## 5. Third-party configuration

### 5.1 PayPal Sandbox

- One Sandbox REST app for the demo: its client ID and secret go to the demo environment.
- A Sandbox **business** account acts as the demonstration merchant; a dedicated Sandbox **personal** account is used for judging ([submission.md § 6](submission.md#6-judge-testing-instructions)).
- Register the webhook URL `https://<demo-domain>/api/webhooks/paypal` with the events in [payments.md § 6](payments.md#6-webhooks); copy its ID to `PAYPAL_WEBHOOK_ID`.
- Local webhook testing requires a public HTTPS tunnel that the developer runs. Add the tunnel host to `allowedDevOrigins` (and `serverActions.allowedOrigins` if actions are used through it) only for that session.

### 5.2 Clerk

- Development keys for local work.
- Clerk production instances require a domain the developer controls, with DNS records set as Clerk instructs (verify in Clerk's current docs). If the demo runs on a hosting-provider subdomain, either use the development instance (which shows a development banner and has usage limits) or buy a domain. This is an open decision ([hackathon.md § 7](hackathon.md#7-open-decisions)).
- Configure allowed origins and redirect URLs for the demo domain in the Clerk dashboard.

### 5.3 Gemini

- A separate API key for the demo, with a budget alert or spending cap set by the developer ([ai.md § 11](ai.md#11-cost-controls)).
- Use a paid-tier key before any real person's data is processed ([privacy.md § 5](privacy.md#5-ai-and-voice-data)).

## 6. Platform notes

The hosting platform is **not decided yet**. Vercel is the natural fit for Next.js 16 and is assumed below; confirm before relying on platform specifics.

- **HTTPS everywhere.** The demo is served only over HTTPS (also required for microphone access, `Secure` cookies, and PayPal webhooks).
- **Region:** place server functions in the same region as the Neon database.
- **Function duration:** voice and AI routes need enough time for the provider call plus overhead; set the route segment `maxDuration` as the installed Next.js docs describe (for example 30 seconds) if the platform default is lower.
- **Trusted client IP:** use only the platform's documented client-IP header for rate-limit keys ([security.md § 8](security.md#8-rate-limiting-and-brute-force-protection)). Record the exact header here once the platform is chosen.
- **Proxy runtime:** Next.js 16 `proxy.ts` runs on the Node.js runtime by default; no runtime configuration is set in it.

## 7. Demo availability

- The demo stays online and functional from submission through the end of judging and winner announcement (about 2026-12-21, see [hackathon.md](hackathon.md)).
- Before any live presentation: open the demo to wake the Neon compute, sign in, and load one request.
- Do not rotate keys, change webhooks, or deploy risky changes during judging unless there is a security need.
- The developer checks the full journey ([testing.md § 7](testing.md#7-critical-journeys-manual-end-to-end-script)) at least weekly during judging, including PayPal webhook delivery.
- Keep free-tier limits (hosting, Neon, Gemini, Clerk) in mind; set alerts where the provider allows.

## 8. Error reporting

- MVP: structured server logs through `src/server/logger.ts`, plus `onRequestError` in `src/instrumentation.ts` to log unhandled server errors with a request ID. Logs follow [security.md § 9](security.md#9-safe-errors-and-logging).
- The developer reads logs in the hosting dashboard.
- Adding an error-reporting service needs approval and a [privacy.md § 9](privacy.md#9-third-party-processors) update.

## 9. Release checklist (developer-run)

1. All environment variables set for the target environment, validated by a successful build.
2. `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` pass locally.
3. Migrations applied to the target database.
4. Catalog seeded.
5. PayPal webhook registered and `PAYPAL_WEBHOOK_ID` set.
6. Clerk origins and redirects configured.
7. Journey script in [testing.md § 7](testing.md#7-critical-journeys-manual-end-to-end-script) passes on the deployed URL, on a phone and a desktop.
8. Privacy page and demo disclosures visible.

## 10. Prohibited patterns

- Agents deploying, or scripts and CI that deploy automatically without approval
- Live PayPal credentials in any environment
- Sharing a database between the demo and development
- Secrets in the repository, build logs, or client bundles
- Making schema changes in the demo database by hand

## 11. Acceptance criteria

- [ ] `.env.local.example` and `.env.production.example` match §3 and each other, and env validation covers every variable used by the current application.
- [ ] The demo runs on HTTPS with Sandbox PayPal, a verified webhook, and its own database.
- [ ] The release checklist in §9 has been completed by the developer.
- [ ] The demo stays available through the judging period.
