# Controlled demo deployment

**Not deployed or verified by the agent.** The host/domain decision remains open.
Vercel is an example, not an automatic selection or authorization to deploy.
Follow the [release audit](../release-readiness.md) and [browser guide](../testing/end-to-end.md).

## Infrastructure decisions

- Choose a stable HTTPS domain and a host supporting this installed Next.js 16
  release, Node runtime, streaming/Cache Components and route `maxDuration`.
- Use a dedicated Neon demo branch/database. Do not share development/preview data
  with the public demo. Keep functions and Neon near the same region; measure cold
  starts and connection/transaction latency rather than promising instant responses.
- Set runtime/build secrets in the host's encrypted settings. Never commit secret
  files, copy their contents into logs, or publish screenshots of dashboards.
- Select Clerk development or production instance for the domain. Development keys
  have limits and a notice; suppressing the notice is not production configuration.
  Production instance/domain/DNS and origins must be verified in Clerk's dashboard.
- Create one Sandbox business merchant/app and a separate Sandbox personal buyer.
  There is no live-payment environment in this project.

## Environment checklist

Use [.env.production.example](../../.env.production.example) as the variable inventory,
not as working credentials. It matches the local template but has production defaults.

| Area | Required private configuration / check |
| --- | --- |
| Origin | NEXT_PUBLIC_APP_URL is the exact stable HTTPS origin, not a path/preview wildcard |
| Clerk | Environment-specific publishable/secret keys; sign-in/up routes and family fallback redirects; allowed origin/domain configuration |
| Database | DATABASE_URL pooled runtime URL; DIRECT_URL direct migration URL for the same dedicated branch; TLS verification retained (`sslmode=verify-full`) |
| Device auth | Unique >=32-random-byte DEVICE_AUTH_SECRET; reviewed trusted ingress/IP configuration; never reuse local key |
| PayPal | PAYPAL_ENVIRONMENT=sandbox; private PAYPAL_CLIENT_ID/SECRET and matching NEXT_PUBLIC_PAYPAL_CLIENT_ID; actual registered PAYPAL_WEBHOOK_ID |
| Approval | PAYPAL_BUYER_APPROVAL_ENABLED=false by default; explicit developer-controlled verification rollout only |
| Gemini | GEMINI_SHOPPING_ENABLED=false; unset deployment/model approval constants; do not configure an enabled real-data flow |
| Images | CLOUDINARY_CLOUD_NAME must match committed reviewed mappings; upload key/secret are not needed by deployed app |
| Simulation | DEMO_FULFILLMENT_CONTROLS=true only for existing simulated controls; never imply real delivery |
| Scripts | CATALOG_USER_AGENT only needed for manual imports, not shopping or seeding; upload credentials belong only in private upload environment |

Do not activate optional Clerk webhooks without their separate approved implementation.
Next loads `.env.local` ahead of `.env.production`; use a clean production build context
without local secrets. Shell/host variables take precedence. CLI config selects
`.env.production` only with `NODE_ENV=production`. Lazy validators do not prove all
provider configuration during build; check each controlled workflow separately.

## Database and build (developer only)

Review the target branch in Neon's dashboard first. In a private terminal configured
for that target, use the exact [Prisma 7 config](../../prisma7.config.ts):

```bash
NODE_ENV=production npx prisma generate --config prisma7.config.ts
NODE_ENV=production npx prisma migrate deploy --config prisma7.config.ts
NODE_ENV=production npx prisma migrate status --config prisma7.config.ts
NODE_ENV=production npx prisma db seed --config prisma7.config.ts
```

Do not use migrate dev, db push or reset against demo/production data. Review a backup
and migration compatibility before applying; do not hand-edit applied SQL. Step 11
introduces no migration. The target needs all eight committed migrations, including
Sandbox payments and payment events.

Seeding validates the reviewed catalog and image mappings offline, then upserts;
it does not call source APIs, approve prices, upload photos or delete products.
Cloudinary cloud-name mapping must match even when local photos were removed.
Restart/redeploy after seeding to invalidate shared catalog cache.

Build command: `npm run build`. Its existing developer-approved script runs
`prisma generate --config prisma7.config.ts && next build`; it must not be overridden
with `next build` alone on a clean host. Generated client files are git-ignored.
Do not add automatic migration/seed hooks or CI. Install dependencies from the lockfile
only as a deliberate developer/hosting operation, then retain the lockfile.

## PayPal verification and release gate

Register `https://your-chosen-domain/api/webhooks/paypal` in the **Sandbox** app, then
privately copy the actual webhook ID. The string above is an example, not a deployed URL.
Subscribe to the implemented events:

- CHECKOUT.ORDER.APPROVED
- PAYMENT.CAPTURE.COMPLETED
- PAYMENT.CAPTURE.PENDING
- PAYMENT.CAPTURE.DENIED / PAYMENT.CAPTURE.DECLINED (where offered)
- PAYMENT.CAPTURE.REFUNDED
- PAYMENT.CAPTURE.REVERSED

Confirm the currently offered events in the Sandbox dashboard. A simulator's unsigned
or nonmatching payload is not evidence of verified payment. Use a real **Sandbox**
order/capture and inspect its signed delivery. Leave deployment protection off only
for the intended public webhook route; no redirect, login page or secret bypass URL
may be required by PayPal. Protect other test environments appropriately.

Keep approval false in templates and on the judge-facing demo until capture code,
migrations, keys, signing, passing tests and a controlled Sandbox reconciliation
have been reviewed. Arrange an explicitly authorized isolated verification rollout;
if the gate prevents that test and no rollout is approved, record BLOCKED rather
than bypassing it. Never make a live API call or mark a client callback paid.

Pending/timeouts stay unconfirmed and locked. A deliberate status refresh reconciles
the stored order; do not manually edit payment/request rows or start another attempt
to erase an uncertain outcome. Reconcile before rollback/redeployment. Do not change
Sandbox app identifiers during an open attempt.

## Trusted client IP and platform limits

The current implementation supports only `DEVICE_IP_SOURCE=vercel` in production,
and checks `VERCEL=1` plus one valid `x-vercel-forwarded-for` address. It fails closed
for unconfigured production ingress. Do not manufacture the header or set VERCEL=1
on another host. A different host requires a separately reviewed adapter.
Vercel documents this header separately from a potentially proxy-overwritten
X-Forwarded-For; review your actual ingress/proxy topology before choosing it.
[Vercel request headers](https://vercel.com/docs/headers/request-headers).

Webhook `maxDuration` is 90 seconds; voice is 30 seconds (voice remains gated).
Confirm the chosen plan permits both, bounded uploads, streaming and the runtime's
memory/concurrency needs. Capture/status Server Actions also need enough function
time for bounded network lookups. A timeout must not imply payment failure/success.
PayPal network operations do not hold a DB transaction; transactional options are
bounded. Measure Neon cold starts before tuning, and do not increase limits blindly.

## Headers, logs and privacy operations

Baseline configuration applies nosniff, strict-origin-when-cross-origin referrers,
camera/geolocation denial, first-party microphone permission and anti-framing headers.
CSP is deliberately deferred until browser-level compatibility is verified.
Test Clerk/PayPal/images/microphone in actual browsers; consider a nonce-based CSP
and `frame-ancestors 'none'` only after testing the complete integration allow-list.
COOP/COEP or HSTS preload also needs separate compatibility and domain review;
do not add them as unchecked release switches.

`src/instrumentation.ts` logs a fixed error category, generated opaque identifier and
SYSTEM/INTERNAL through the existing logger, not raw exceptions, URLs, headers or bodies.
Handled boundary failures already log separately. Configure host access-log redaction
and retention: the application hook cannot control provider logs or Next's own output.
Do not enable body/transcript/session recording or a new monitoring processor.

Assign an owner and approved developer-run schedule for `purgeDeviceData` and
`purgeRequestInputText`. These functions are not a cron, route or CLI command; this
step does not add an automatic job. Verify the 30-minute review, pairing/device,
90-day final-text, 180-day audit and expired-counter rules on fictional data through
an approved maintenance procedure before using real information.

Privacy contact is approved, but family/account deletion operations, verification
of authority and retained/unmatched PaymentEvent metadata need an operator procedure.
Record Neon's actual backup restore window and host log retention; these are not
inferred from code. Profile deletion cascades payment rows but preserves minimal
events via SetNull. Do not promise every copy disappears immediately.

## Deployment acceptance record

Use Pass / Fail / Blocked with date, commit and private evidence for every row:

| Check | Result / evidence |
| --- | --- |
| Host/domain/HTTPS chosen; dedicated branch and all migrations confirmed | |
| Lint, type check, full Vitest, production build on clean environment | |
| Public landing, `/privacy`, `/data-sources`, attribution/database offer | |
| Clerk sign-in/out, setup, origins and redirect behavior | |
| Trusted-IP pairing, cookies, approval, completion and revocation | |
| Catalog photos/pagination, picture Send and local matching/private review | |
| Sandbox create, approval, capture, refresh and signed webhook retry | |
| Manager/requester confirmation privacy; fulfillment unchanged by payment | |
| Phone/tablet/desktop, keyboard, screen reader, zoom and headers | |
| Privacy/deletion/maintenance/backups/log policies assigned and verified | |
| Independent judge walkthrough and availability plan | |

Do not publish while security-critical checks fail. Keep the demo available through
judging and announcement; warm it before presentations, check the full journey
weekly and avoid risky migrations/key changes during judging. No demo URL or
successful deployment is asserted by this document.
