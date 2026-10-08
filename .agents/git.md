# Git Workflow

**Purpose:** Keep CareBasket's history clean, reviewable, and free of secrets, with the developer in full control of every Git write.
**Applies to:** The end of every task, and anything that decides what may be committed.
**Related:** [workflow.md](workflow.md), [security.md § 10](security.md#10-secret-management), [submission.md](submission.md)
**Last reviewed:** 2026-10-08

---

## 1. Agent rules

- Agents **never** run Git write commands: `add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `restore`, `checkout -- <path>`, `stash`, `tag`, `cherry-pick`, `clean`, or branch creation and deletion ([workflow.md § 1.1](workflow.md#11-agents-must-not-execute)).
- Agents may run read-only commands (`git status`, `git diff`, `git log`, `git show`) to understand the working tree.
- At the end of each task, agents suggest **one concise commit message** and, when helpful, show the exact commands for the developer to run, for example:

```bash
git add .agents/payments.md src/features/checkout/
git commit -m "feat(checkout): capture and verify PayPal sandbox orders"
```

## 2. Changes

- Small and focused: one feature, fix, or documentation change per commit.
- No unrelated edits: no drive-by reformatting, renames, or dependency bumps.
- Rule changes (`.agents/`) are committed separately from feature code.
- Schema changes are committed together with their migration.

## 3. Commit messages

Format: `type(scope): summary`

- `type`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`
- `scope`: a feature or area (`auth`, `devices`, `requests`, `assistant`, `checkout`, `catalog`, `ui`, `db`, `rules`)
- `summary`: imperative, lowercase, no trailing period, at most 72 characters
- Add a body only when the reason is not obvious from the summary.

Examples: `feat(devices): add adult approval for pairing codes`, `fix(checkout): reject capture when amount differs`, `docs(rules): establish agent engineering rules`.

## 4. What may be committed

| Commit | Do not commit |
| --- | --- |
| Source, tests, styles, docs | `.env`, `.env.local`, any file with secret values |
| `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts` | `src/generated/**` (Prisma Client output) |
| `package.json` and `package-lock.json` together, when dependencies change | `node_modules/`, `.next/`, `coverage/`, build output |
| `.env.example` with names and placeholders only | Screenshots or exports containing personal data or credentials |
| Optimized demo catalog images in `public/products/` | Large binaries, videos, raw design files, audio recordings |
| `LICENSE`, `README.md` | Editor and OS files (`.DS_Store`, local IDE settings) |

Notes:

- `.gitignore` currently ignores `.env*`, which also ignores `.env.example`. Add `!.env.example` before committing an example file.
- `package-lock.json` changes only through the developer's npm commands and is committed with the matching `package.json` change.
- The `.agents/skills/`, `.claude/skills/`, and `.windsurf/skills/` directories and `skills-lock.json` are agent tooling; committing them is the developer's choice.

## 5. Branches and history

- `main` stays demonstrable. Work on short-lived branches named `type/short-description` (for example `feat/device-pairing`) when the developer wants a branch.
- No force pushes to `main` or any shared branch. No history rewriting after pushing.
- No destructive commands (`reset --hard`, `clean -fd`, `push --force`) without the developer's own decision.

## 6. Secrets in Git

- Before committing, the developer checks `git diff --staged` for keys, tokens, connection strings, and personal data.
- If a secret is ever committed, rotate it at the provider immediately. Removing it from history is not enough once it has been pushed.
- The repository will be public for the hackathon ([hackathon.md](hackathon.md)). Treat every commit as public.

## 7. Acceptance criteria

- [ ] The task's changes form one focused commit (or a small, clearly separated set).
- [ ] The suggested message follows §3.
- [ ] No ignored, generated, or secret files are included.
- [ ] The agent performed no Git writes.
