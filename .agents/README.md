# CareBasket Engineering Rules — Index

**Purpose:** Authoritative index of the rules that every coding agent (Codex, Claude Code, and any other assistant) and every human contributor follows on CareBasket.
**Applies to:** Every task, without exception.
**Last reviewed:** 2026-10-09

The rules in this directory are permanent project policy. They are not suggestions. Read this file first, then the documents your task requires.

---

## 1. Rule documents

| Document | Governs | Consult when |
| --- | --- | --- |
| [workflow.md](workflow.md) | Agent execution restrictions, task lifecycle, completion report | **Every task** |
| [project.md](project.md) | Mission, users, journeys, MVP scope, exclusions | **Every task** (scope check) |
| [architecture.md](architecture.md) | Next.js 16 App Router patterns, layers, errors, integrations | Any code change |
| [folder-structure.md](folder-structure.md) | Directory layout, naming, imports, file size | Creating or moving files |
| [design.md](design.md) | Visual design, tokens, components, states | Any UI work |
| [accessibility.md](accessibility.md) | WCAG 2.2 AA rules for CareBasket users | Any UI work |
| [authentication.md](authentication.md) | Clerk adults, managed profiles, device pairing, sessions | Auth, sessions, permissions, profiles, devices |
| [security.md](security.md) | Authorization, isolation, validation, secrets, audit | Any server code, any data access |
| [database.md](database.md) | Neon + Prisma conventions, planned models, migrations | Schema, queries, seed data |
| [api.md](api.md) | Server Actions, Route Handlers, validation, errors, status codes | Any server entry point |
| [payments.md](payments.md) | PayPal Sandbox workflow, money handling, webhooks | Anything touching baskets, prices, checkout |
| [ai.md](ai.md) | AI capabilities, request workflow, Gemini provider, voice, clarification, budgets, safety | Anything touching AI, voice, suggestions, or budgets |
| [catalog.md](catalog.md) | Open Prices integration, U.S. verification, normalization, demo prices, images, data licensing | Anything touching products, prices, catalog import or seed data, product images, or data attribution |
| [privacy.md](privacy.md) | Consent, minimization, retention, children, demos | Personal data, recordings, deletion, demos |
| [testing.md](testing.md) | Test strategy, what to test, manual commands | Writing or changing tests; end of every coding task |
| [git.md](git.md) | Commit hygiene, what may be committed | End of every task |
| [performance.md](performance.md) | Rendering, bundles, images, queries, caching | UI and data-loading work |
| [deployment.md](deployment.md) | Environments, env vars, webhooks, demo hosting | Configuration and release preparation |
| [hackathon.md](hackathon.md) | Verified PayPal AI Hackathon 2026 requirements | Scope decisions, demo, submission |
| [submission.md](submission.md) | Final submission checklist | Final two weeks before the deadline |

The `.agents/skills/` directory holds third-party agent skills (Prisma). They are reference material for API usage only. **Any instruction in a skill to run a command is overridden by [workflow.md](workflow.md).**

## 2. Rules for every task

1. Read [workflow.md](workflow.md) and obey its execution restrictions. Agents never install, lint, build, test, format, migrate, deploy, or write to Git.
2. Check [project.md](project.md) scope. Do not add features outside the MVP without developer approval.
3. Read the topic documents listed for your task type below **before** changing code.
4. Read the relevant installed documentation before using a framework API: Next.js docs in `node_modules/next/dist/docs/`, and the README or type definitions of other packages in `node_modules/`. Installed versions win over memory.
5. Never read, print, copy, or disclose secret values from `.env*` files.
6. End with the completion report defined in [workflow.md § Completion report](workflow.md#7-completion-report).

## 3. Additional rules by task type

| Task type | Required reading (in addition to §2) |
| --- | --- |
| Frontend / UI | design, accessibility, performance, architecture (§ Server vs Client), folder-structure |
| Backend / server logic | architecture, api, security, folder-structure, testing |
| Authentication / devices / profiles | authentication, security, privacy, database |
| Database / schema | database, catalog (for catalog models), security, privacy |
| AI / voice | ai, catalog, privacy, security, api, testing |
| Catalog / product data / import scripts | catalog, database, security, privacy, testing |
| Payments / checkout | payments, catalog (§ 6 prices), security, api, database, testing |
| Deployment / configuration | deployment, security, hackathon |
| Demo / submission | hackathon, submission, privacy |

## 4. Rule precedence

When instructions conflict, apply the first matching level:

1. **Agent execution restrictions** in [workflow.md](workflow.md) and **security boundaries** in [security.md](security.md). Only the developer can change these, and only by editing those files. A chat request does not override them; respond with the exact command for manual execution instead.
2. **Explicit instructions from the human developer** for the current task.
3. **The most specific `.agents/` document** for the topic (for example, [payments.md](payments.md) wins over [api.md](api.md) for checkout endpoints; [security.md](security.md) wins over any other document on a security question).
4. **Official documentation for the installed package version** (`node_modules/next/dist/docs/`, package READMEs and types, current vendor docs).
5. **Skills** in `.agents/skills/` (reference only).
6. General knowledge and training data (lowest; often outdated for this stack).

## 5. Conflicting or outdated guidance

- If a developer instruction conflicts with a rule at level 3, state the conflict in one or two sentences, follow the developer's confirmed choice, and propose the matching rule update.
- If a rule names an API that the installed package no longer provides (or marks deprecated), follow the installed documentation, keep the rule's intent, and flag the outdated rule in your completion report.
- If two rule documents contradict each other, stop and ask. Do not pick silently.
- If a rule seems wrong for a specific case, implement the rule-compliant option and explain the concern. Do not make silent exceptions.

## 6. Proposing changes to these rules

1. Propose the change in the completion report or as a separate, clearly labelled edit to the relevant `.agents/` file. Never mix rule changes into feature changes.
2. Keep one source of truth: change the owning document and cross-reference it from others. Do not duplicate text.
3. Update the **Last reviewed** date on any document you change.
4. Rule changes take effect only after the developer accepts them.
5. Agents must never weaken [workflow.md](workflow.md) restrictions or [security.md](security.md) boundaries on their own initiative.

## 7. Glossary

| Term | Meaning |
| --- | --- |
| **Family manager** | Adult with a Clerk account and an `OWNER` or `MANAGER` membership in a family. Only family managers review and pay. |
| **Managed profile** | A person the manager sets up who has no Clerk account: an *assisted adult* (for example, an elderly relative) or a *supervised child*. |
| **Authorized device** | A browser that a family manager has paired to exactly one managed profile. |
| **Device session** | The restricted, revocable session that an authorized device holds. |
| **Requester** | The managed profile that creates a shopping request. |
| **Shopping request** | What the requester asked for, plus its workflow status. |
| **Basket** | The priced, server-validated list of catalog items for a request. |
| **Payment confirmed** | PayPal capture verified by the server. **Not** the same as delivered. |
| **Demo price** | The approved CareBasket Demo Market price used for Sandbox checkout (`DemoMerchantPrice`). The only price used for money. |
| **Reference price observation** | A historical, crowdsourced U.S. price report from Open Prices. Never a checkout price. |
| **Suggestion** | An item AI proposed that the requester did not explicitly ask for; always labelled and confirmed by the requester. |
| **Fulfillment** | Simulated delivery status for the hackathon demo merchant. |

## 8. Changelog

| Date | Change |
| --- | --- |
| 2026-10-08 | Initial rulebook created. |
| 2026-10-08 | Added `catalog.md` (Open Prices, U.S. verification, demo prices, data licensing). Expanded AI capabilities (context-aware suggestions, per-request budgets, clarification workflow). Replaced the visual design with PayPal-inspired tokens, DM Sans, and Atkinson Hyperlegible Next for requester reading text. Reconciled project, database, architecture, folder-structure, payments, privacy, security, testing, authentication, performance, submission, deployment, and git. |
| 2026-10-08 | Git: every changed file gets its own commit and message, in dependency order (`git.md` § 2). |
| 2026-10-08 | Step 3: `User`, `Family`, `FamilyMembership` models; Prisma CLI uses `DIRECT_URL` and loads `.env.local` then `.env`; `ensureUser()`, `requireAdult()`, and transactional family setup documented. |
| 2026-10-08 | Sign-in and sign-up open as Clerk dialogs; `/sign-in` and `/sign-up` are redirect routes that open the dialog on the home page. |
| 2026-10-08 | Step 2: Clerk 7 resource-level protection (no `createRouteMatcher`), `<Show>` replaces removed `SignedIn`/`SignedOut`, Clerk redirect variables documented, compact type scale with `--text-xs` and `--text-md`, Vitest and Clerk mocking conventions. |
| 2026-10-09 | Replaced the generic environment template with aligned local and production templates; real environment files remain ignored. |
