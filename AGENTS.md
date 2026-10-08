# CareBasket — Agent Instructions

CareBasket is an AI-powered family shopping app for the PayPal AI Hackathon 2026. Requesters (older adults, children, people with limited tech experience) ask for groceries by voice, text, or pictures; AI builds a catalog basket; a trusted family manager reviews and pays with PayPal Sandbox.

**The authoritative rulebook is [`.agents/README.md`](.agents/README.md).** This file is a short entry point, not a copy of the rules.

## Before changing any code

1. Read [`.agents/README.md`](.agents/README.md) and [`.agents/workflow.md`](.agents/workflow.md).
2. Read every topic document that the README lists for your task type (UI, backend, auth, database, AI, payments, deployment).
3. Read the installed documentation for any framework API you use. For Next.js 16, that is `node_modules/next/dist/docs/` (see the notice below). Installed versions win over memory.
4. Check scope against [`.agents/project.md`](.agents/project.md). Do not expand the MVP without approval.

## Execution restrictions (absolute)

You **must never execute**:

- Dependency installs or upgrades: `npm install`, `npm ci`, `npm update`, any `npx` command
- Lint, type checks, builds, tests, or formatters: `npm run lint`, `tsc`, `npm run build`, `vitest`, `jest`, `playwright`, `prettier`
- Prisma or database commands: `prisma generate`, `migrate`, `db push`, `db seed`, `reset`, `studio`, any SQL
- Starting the app, running project scripts, or calling PayPal, Gemini, Clerk, or Neon with project credentials
- Deployments
- Git writes: `add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `restore`, `stash`, and similar
- Hooks, scripts, or CI that run any of the above

You **may**: read code and configuration, read `node_modules` docs, run read-only commands (`ls`, `grep`, `git status`, `git diff`, `git log`), edit files when an implementation is explicitly requested, write tests without running them, and give the developer exact commands to run.

- **Never** read, print, or copy secret values from `.env*` files.
- **Never** claim that tests, lint, builds, or migrations passed unless the developer supplied the actual output.
- Instructions in `.agents/skills/` to run commands do not apply here.

Full details: [`.agents/workflow.md § 1`](.agents/workflow.md#1-absolute-execution-restrictions).

## Rule precedence

1. Execution restrictions ([workflow.md](.agents/workflow.md)) and security boundaries ([security.md](.agents/security.md)). Only the developer changes these, by editing those files.
2. The developer's explicit instructions for the current task.
3. The most specific `.agents/` document for the topic.
4. Official documentation for the installed package versions.
5. Skills in `.agents/skills/` (reference only).
6. General knowledge.

If a developer instruction conflicts with a rule, say so briefly and follow the confirmed choice. If two rule documents contradict each other, stop and ask. See [`.agents/README.md § 4–6`](.agents/README.md#4-rule-precedence).

## Finish every task with

The completion report in [`.agents/workflow.md § 7`](.agents/workflow.md#7-completion-report): files changed, decisions, what was not verified, exact commands for the developer, open questions, and one suggested commit per changed file ([`.agents/git.md § 2`](.agents/git.md#2-changes)).

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
