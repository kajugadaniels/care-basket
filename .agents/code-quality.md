# Code Quality and Readability

**Purpose:** Keep CareBasket code easy to read, understand, change, and remove.
**Applies to:** Every source-code change.
**Related:** [architecture.md](architecture.md), [folder-structure.md](folder-structure.md), [testing.md](testing.md), [workflow.md](workflow.md)
**Last reviewed:** 2026-10-09

---

## 1. Readability first

- Write for the next person reading the code. Prefer clear names and straightforward control flow over clever or compressed expressions.
- Keep one meaningful operation per line. Break dense JSX, chained calls, and compound statements across lines when that makes their structure easier to scan.
- Use blank lines to separate imports, setup, validation, business logic, and return values. Do not add vertical space inside one tightly related operation.
- Prefer early returns over deeply nested conditionals.
- Keep functions focused. If a function needs several unrelated comments to explain its sections, split it by responsibility.

## 2. Indentation and formatting

- Use tabs for indentation in code files when the language and tooling permit tabs.
- Use spaces where the format requires or conventionally depends on them, including YAML indentation, Markdown lists and tables, and alignment within a line.
- Do not use tabs to line up columns manually. Format structures consistently and let natural indentation show nesting.
- If a formatter is introduced later, configure it to use tabs for code indentation. Its configuration becomes the source of truth for mechanical layout unless the developer changes this rule.
- Do not reformat untouched files or unrelated sections merely to change indentation. Apply these rules to new and modified code; make broader formatting changes only as a dedicated, developer-approved task.

## 3. Comments

- Prefer self-explanatory code. Add comments when they explain **why** a decision exists, a non-obvious invariant, a security boundary, an accessibility requirement, or a provider/framework limitation.
- Do not comment what the next line already says.
- Keep comments accurate when changing the code they describe. Remove stale, redundant, commented-out, and TODO comments that no longer have a concrete owner or purpose.
- Never use comments to excuse unclear code when clearer names or a smaller function would solve the problem.

## 4. Reuse without premature abstraction

- Reuse an existing component, function, schema, token, or type when it already expresses the same responsibility.
- Keep code local when it has one caller. Extract shared code when duplication is real and the shared behavior has one stable meaning; three similar call sites are the normal signal.
- Do not create generic helpers, wrappers, base classes, or configuration for hypothetical future use.
- A reusable API must make callers simpler and preserve the ownership boundaries in [architecture.md](architecture.md).

## 5. Remove what is not needed

- Delete confirmed dead code, unused imports, obsolete branches, abandoned comments, and redundant abstractions as part of the change that makes them unnecessary.
- Before deleting code, check its imports, routes, tests, scripts, configuration references, and documented purpose. Do not infer that externally invoked or framework-discovered code is unused from imports alone.
- Do not keep compatibility layers without a current caller or documented requirement.
- Never remove authorization, validation, error handling, accessibility behavior, audit logging, tests, migrations, or public contracts merely to reduce line count. Simplicity must preserve required behavior and project rules.
- Keep unrelated cleanup out of feature commits. If removal extends beyond the requested scope, report it as a separate follow-up.

## 6. Acceptance criteria

- [ ] Names and control flow communicate intent without requiring narration.
- [ ] Tabs are used for new code indentation where the file format permits them.
- [ ] Comments explain decisions or constraints, not syntax.
- [ ] Reuse removes real duplication without introducing speculative abstraction.
- [ ] Confirmed dead code made obsolete by the change is removed safely.
- [ ] Security, accessibility, tests, and required behavior remain intact.
- [ ] Unrelated files and sections were not reformatted or cleaned up.
