# Submission readiness

As of October 12, 2026: **not submission-ready**. This checklist records source
preparation, not eligibility, a deployed service, successful payments or real AI use.

| Item | Current status | Required evidence / owner action |
| --- | --- | --- |
| Repository | CODE_PRESENT | https://github.com/kajugadaniels/care-basket — developer checks public signed-out access |
| Demo URL | BLOCKED / not supplied | Add only the actual verified HTTPS URL; no invented placeholder deployment |
| Public YouTube video URL | BLOCKED / not supplied | Record working product, public video under three minutes, English/captions; signed-out link check |
| Source license | CODE_PRESENT / developer approved | Full MIT, copyright 2026 Daniels KAJUGA; publish with repository |
| Catalog/photo licensing | CODE_PRESENT | ODbL catalog, DbCL contents, per-photo CC BY-SA attribution; verify database offer and image links publicly |
| PayPal integration | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN | Orders v2, SDK v6, server capture, verified signed events; actual Sandbox journey still required |
| Buyer approval | MANUAL_VERIFICATION_REQUIRED | Disabled by default; prerequisites/controlled verification before judge-facing enablement |
| Gemini/voice | BLOCKED | Unset global approval/model, disabled flag; resolve application-wide provider terms before real usage |
| Local text and pictures | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN | Useful fallback, not evidence of genuine Gemini calls |
| Host/domain/Clerk/Neon | MANUAL_VERIFICATION_REQUIRED | Confirm selected host, origins, dedicated DB branch, migrations, seed, headers, limits and trusted IP |
| Privacy | CODE_PRESENT; operational verification required | Public page/contact approved; full family/account deletion process, retained event metadata, maintenance and backup/log schedules unresolved |
| Accessibility/responsive | MANUAL_VERIFICATION_REQUIRED | Keyboard, screen readers, phone/tablet/desktop, required widths and 200% zoom; no WCAG certification claimed |
| Automated tests/build | TESTS_WRITTEN_NOT_RUN | Attach dated developer output at exact commit; no assumed pass from prior steps |
| Judge walkthrough | MANUAL_VERIFICATION_REQUIRED | Independent signup/family/pairing, fictional data, privately supplied Sandbox buyer procedure, no privileged developer intervention |

## Official rules: developer confirmation still required

The official rules were source-checked October 12, 2026. Recheck them before submission:
deadline **November 12, 2026 at noon PST** (**22:00 Africa/Kigali**). Submit earlier
for a buffer. Judging is December 1–15, with announcement around December 21.
[Official PayPal AI Hackathon rules](https://paypalaihackathon.devpost.com/rules).

The rules require PayPal Sandbox plus an AI tool, a functional installable/runnable
project, public source with a complete open-source license and a public short video.
A hosted deployment is useful for judging; do not confuse it with an explicitly
mandatory hosting requirement. Confirm current eligibility, submission fields,
third-party authorization and optional sponsor-prize conditions yourself.
[Official submission requirements](https://paypalaihackathon.devpost.com/rules).

Gemini's application-wide age restriction remains relevant even if child endpoints
are blocked. Do not silently turn on an assisted-adult flag to claim compliance.
No alternative provider or scope change is authorized by this release pass.
[Gemini API terms](https://ai.google.dev/gemini-api/terms).

## Judge procedure and truthful demonstration

Use the [two-browser guide](testing/end-to-end.md). Judges sign up with their own
manager account, create a fictional family/profile, pair a private requester window,
send pictured/text-matched groceries, review, then complete approved Sandbox checkout.
Explain cold-start delay and recovery. Confirm they can do this without access to
developer dashboards or private assistance. Keep Gemini/voice visibly unavailable
until approved; do not present matching as an actual provider demonstration.

Create a dedicated Sandbox personal buyer account only for judging. Put those test
credentials **only** in Devpost's private judge-facing testing instructions, never
GitHub/README/video/chat screenshots. Do not share adult-manager credentials. Rotate
or disable the judge buyer after judging. No live account, card or genuine payer
information belongs in the demo.

Once gates and evidence are resolved, record a video of the real working journey,
not mocked responses. Show payment confirmed separately from simulated fulfillment.
Keep test-environment, simulated merchant/prices, no real delivery, open-data
attribution and independent/no-PayPal-endorsement disclosures in the submission.

## Final release decisions

- [ ] Official rules and participant eligibility confirmed by the developer.
- [ ] Genuine allowed AI operation demonstrated; terms/model decision documented.
- [ ] Isolated Sandbox capture and signed webhook reconciliation verified.
- [ ] Public host/domain, Clerk, DB/migrations/catalog and judge access verified.
- [ ] Full tests/build, browser/accessibility/performance evidence recorded.
- [ ] Privacy/deletion/retention operations assigned and reviewed.
- [ ] Public repository, license/attribution, video and actual demo links checked signed out.
- [ ] Fictional screenshots only; secrets/history reviewed; no raw receipts/audio/payer details.
- [ ] Availability and weekly journey checks arranged through judging/announcement.

See [release audit](release-readiness.md) and
[deployment preparation](deployment/demo-deployment.md). Every unchecked decision
remains open; do not publish this checklist as completed.
