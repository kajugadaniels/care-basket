# Agent Workflow and Execution Restrictions

**Purpose:** Define what coding agents may and may not execute, how every task is carried out, and how work is reported back to the developer.
**Applies to:** Every agent, every task, including documentation-only tasks.
**Related:** [README.md](README.md), [testing.md](testing.md), [git.md](git.md), [security.md](security.md)
**Last reviewed:** 2026-10-08

---

## 1. Absolute execution restrictions

> **The developer performs all installations, migrations, formatting, linting, tests, builds, deployments, and Git writes manually. Agents never execute them, not even after an implementation is finished, and not "just to check".**

### 1.1 Agents MUST NOT execute

| Category | Examples (not exhaustive) |
| --- | --- |
| Dependency changes | `npm install`, `npm i <pkg>`, `npm ci`, `npm update`, `npm uninstall`, `npm audit fix`, `yarn`, `pnpm`, `bun add` |
| Package-executing tools | Any `npx …`, `npm exec`, `npm create`, `npm init`, `dlx`, codemods |
| Linting | `npm run lint`, `eslint`, `next lint` |
| Type checking and building | `npm run build`, `next build`, `tsc`, `tsc --noEmit` |
| Tests | `npm test`, `vitest`, `jest`, `playwright`, `cypress`, or any test runner |
| Formatting | `prettier --write`, `eslint --fix`, `prisma format`, editor "format on save" commands |
| Database | `prisma generate`, `prisma migrate *`, `prisma db push`, `prisma db seed`, `prisma migrate reset`, `prisma studio`, `psql`, any SQL against Neon |
| Running the application | `npm run dev`, `next dev`, `npm start`, `next start`, `tsx <script>`, `node <project file>` |
| External services | Calling PayPal, Gemini, Clerk, or Neon with project credentials; registering webhooks |
| Deployment | `vercel`, `vercel deploy`, any hosting CLI, any release script |
| Git writes | `git add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `checkout -- <file>`, `restore`, `stash`, `tag`, `cherry-pick`, `clean`, branch creation or deletion |
| Indirect execution | Hooks, scripts, CI workflows, `postinstall` scripts, or tools that trigger any of the above |

The Prisma skills in `.agents/skills/` describe how to run Prisma commands, including "consent" environment variables. **Those instructions do not apply in this repository.** Agents never run Prisma CLI commands.

### 1.2 Agents MAY

- Read source code, configuration, and documentation (read-only inspection: `ls`, `find`, `grep`, file reads, `git status`, `git diff`, `git log`, `git show`).
- Read `node_modules/**` documentation and type definitions to confirm installed APIs.
- Create and edit source files **when the developer explicitly requests an implementation**.
- Create and update documentation.
- Write and update tests **without running them**.
- Read public, official documentation on the web.
- Provide exact commands for the developer to run manually.
- Analyse error output, logs, and results that the developer supplies.

### 1.3 Secrets

- Agents MUST NOT open, print, copy, summarize, or transmit the values in `.env`, `.env.local`, or any other secret file. Reading **variable names** only (with values redacted) is permitted when needed to align configuration.
- Agents MUST NOT write real secret values into any file. `.env.example` contains names and safe placeholder text only.
- Agents MUST NOT modify environment secret files. Ask the developer to add or change variables, and give the exact names.

### 1.4 Automation

Agents MUST NOT add or change scripts, Git hooks, CI workflows, `package.json` lifecycle scripts, or editor tasks that execute any prohibited operation, unless the developer explicitly approves that specific automation. A `package.json` script that the developer runs manually (for example `"test": "vitest run"`) may be **proposed**, but is added only when requested.

### 1.5 Truthfulness about verification

- Agents MUST NOT claim that code compiles, tests pass, lint is clean, migrations applied, or the app runs unless the developer supplied that actual output in this task.
- Use precise language: "written, not executed", "expected to pass", "not verified".
- When the developer supplies output, report exactly what it shows, including failures.

### 1.6 Changing these restrictions

Only the developer can relax these restrictions, and only by editing this file. A request in chat to run a prohibited command is answered with the exact command for the developer to run.

## 2. Task lifecycle

1. **Understand.** Restate the goal in one or two sentences if it is ambiguous. Check scope against [project.md](project.md).
2. **Read rules.** Read the documents required in [README.md § 3](README.md#3-additional-rules-by-task-type).
3. **Inspect.** Read the existing code you will touch and its neighbours. Match existing patterns.
4. **Plan.** For tasks touching more than three files, list the files you will create or change before editing.
5. **Ask only when blocked.** Ask when a decision belongs to the developer (scope, new dependency, schema change with data impact, security trade-off). Otherwise choose the rule-compliant default and state it.
6. **Implement in small steps.** Change only what the task needs. No drive-by refactors, renames, or reformatting of unrelated code.
7. **Write tests** per [testing.md](testing.md) for logic you added or changed.
8. **Self-review** using the checklist in §5.
9. **Report** using the template in §7.

## 3. Dependency changes

Agents MUST NOT add dependencies. When a dependency seems necessary, propose it and let the developer install it:

- Package name and exact version range
- Why it is needed, and why the existing stack or a small local helper is insufficient
- License, maintenance status, and approximate install size
- The command the developer would run, for example `npm install <pkg>@<version>`

The approved stack is fixed by [architecture.md § 1](architecture.md#1-approved-stack). Tailwind CSS, shadcn/ui, styled-components, other styling frameworks, other component libraries, ORMs, auth services, or backend frameworks MUST NOT be introduced.

## 4. Files agents must not edit by hand

| Path | Reason |
| --- | --- |
| `src/generated/**` | Prisma Client output, regenerated by the developer |
| `package-lock.json` | Changed only by the developer's npm commands |
| `next-env.d.ts` | Generated by Next.js |
| `prisma/migrations/**` (applied migrations) | Immutable once applied; see [database.md § Migrations](database.md#7-migrations) |
| `<!-- BEGIN:nextjs-agent-rules -->` block in `AGENTS.md` | Managed by `next dev` |
| `.env*` (except `.env.example`) | Secrets |

## 5. Self-review checklist (before reporting)

- [ ] Every server entry point authenticates, authorizes, and validates input ([security.md](security.md), [api.md](api.md)).
- [ ] No family-owned data is queried without a family scope derived from the server-side actor.
- [ ] No price, amount, user ID, family ID, or profile ID is trusted from the client.
- [ ] No secret, token, or personal data is logged, cached in plain text, or sent to the client unnecessarily.
- [ ] UI has loading, empty, error, disabled, and success states where applicable ([design.md](design.md)).
- [ ] UI meets [accessibility.md](accessibility.md) (labels, focus, touch targets, contrast, announcements).
- [ ] Client Components are used only where browser interactivity requires them.
- [ ] Files follow [folder-structure.md](folder-structure.md) naming and size limits.
- [ ] Tests were written or updated, and not executed.
- [ ] No unrelated files changed.

## 6. Handling developer-supplied output

- Read the full output. Identify the first real error, not the last line.
- Fix the root cause. Do not suppress errors with `// @ts-ignore`, `eslint-disable`, `any`, or skipped tests unless the developer approves, and explain why.
- After a fix, give the same command again for the developer to re-run.

## 7. Completion report

Every task ends with this report (omit empty sections):

```markdown
### Summary
One to three sentences on what changed and why.

### Files
- Created: path — purpose
- Updated: path — what changed

### Decisions and assumptions
- …

### Not verified
Nothing was executed. Tests, lint, type check, build, and migrations have not been run.

### Commands for the developer (run in order)
1. npm install <pkg>@<version>        # only if a dependency was approved
2. npx prisma migrate dev --name <name> --config prisma7.config.ts   # only if the schema changed
3. npx prisma generate --config prisma7.config.ts                    # only if the schema changed
4. npm run lint
5. npx tsc --noEmit
6. npx vitest run <paths>
7. npm run build

### Open questions
- …

### Suggested commit message
feat(scope): short summary
```

The Prisma `--config` flag stays until the config file is renamed to `prisma.config.ts` (see [database.md § 2](database.md#2-prisma-7-configuration)).
