# Visual Design

**Purpose:** Give CareBasket a calm, premium, highly legible interface that works on every screen size, with one small set of tokens and component patterns.
**Applies to:** Any UI work.
**Related:** [accessibility.md](accessibility.md) (which wins on any conflict), [performance.md](performance.md), [folder-structure.md](folder-structure.md)
**Last reviewed:** 2026-10-08

---

## 1. Principles

1. **Clarity over decoration.** Every element earns its place.
2. **One main action per screen region.** The primary action is obvious within one second.
3. **Big, calm, and warm.** Generous spacing, large type, soft neutral surfaces, one brand color.
4. **Same pattern, same meaning.** A button, card, or status badge looks and behaves the same everywhere.
5. **Two audiences, one system.** Requester screens are simpler and larger than manager screens, but use the same tokens and components.

## 2. Styling rules

- Component styles live in a colocated CSS Module. `globals.css` contains only the reset, design tokens, base element styles (`body`, headings, links, focus), and font variables.
- Every value comes from a token: color, spacing, radius, shadow, font size, duration. Raw hex values or pixel spacings in CSS Modules are prohibited, except `1px` borders and media query breakpoints.
- Use logical properties (`margin-inline`, `padding-block`) to stay localization-ready.
- Size text with `rem`; never set `html { font-size }` in `px` (it breaks user text scaling).
- The MVP ships **one light theme**. Remove the scaffold's automatic dark-mode overrides when tokens are introduced, and set `color-scheme: light`. Tokens are named semantically so a dark theme can be added later without touching components.

## 3. Design tokens

Define these in `src/app/globals.css` under `:root`. Values are the initial palette; verify every text and UI pairing with a contrast checker when first implemented ([accessibility.md § 3](accessibility.md#3-visual-and-reading-requirements)).

```css
:root {
  /* Color — surfaces and text */
  --color-bg: #faf8f5;            /* warm off-white page background */
  --color-surface: #ffffff;       /* cards, dialogs */
  --color-surface-muted: #f2eee8; /* secondary panels */
  --color-border: #ddd6cc;        /* decorative dividers only */
  --color-border-strong: #8a8178; /* input and control borders (≥ 3:1) */
  --color-text: #1f1b16;
  --color-text-muted: #5c554d;    /* still ≥ 4.5:1 on bg */

  /* Color — brand and states */
  --color-primary: #155e75;       /* deep teal */
  --color-primary-hover: #0f4c5f;
  --color-on-primary: #ffffff;
  --color-focus: #b45309;         /* focus ring; distinct from brand */
  --color-success: #1e7a3c;   --color-success-bg: #e6f4ea;
  --color-warning: #8a5a00;   --color-warning-bg: #fff4d6;
  --color-danger: #b42318;    --color-danger-bg: #fdecea;
  --color-info: #1d5fa8;      --color-info-bg: #e8f1fb;

  /* Typography */
  --font-sans: var(--font-atkinson), system-ui, sans-serif;
  --text-sm: 1rem;        /* 16px — manager metadata; the minimum anywhere */
  --text-base: 1.125rem;  /* 18px — default body */
  --text-lg: 1.375rem;    /* 22px — requester body, card titles */
  --text-xl: 1.75rem;     /* 28px — page titles (manager) */
  --text-2xl: 2.25rem;    /* 36px — page titles (requester) */
  --leading-body: 1.5;
  --leading-tight: 1.2;
  --weight-regular: 400;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Spacing (4px base) */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem;  --space-4: 1rem;
  --space-5: 1.5rem;   --space-6: 2rem;    --space-7: 3rem;     --space-8: 4rem;

  /* Shape and depth */
  --radius-sm: 6px;  --radius-md: 10px;  --radius-lg: 16px;  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgb(31 27 22 / 0.08);
  --shadow-md: 0 4px 12px rgb(31 27 22 / 0.10);

  /* Controls */
  --control-height: 3rem;     /* 48px — minimum for any control */
  --control-height-lg: 4rem;  /* 64px — requester primary actions */

  /* Layout */
  --content-max: 72rem;   /* manager pages */
  --reading-max: 40rem;   /* forms, requester pages */

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Layers */
  --z-header: 10;  --z-dialog: 100;  --z-toast: 200;
}
```

**Font:** Atkinson Hyperlegible Next (available in `next/font/google`), loaded once in the root layout as the CSS variable `--font-atkinson`, replacing the scaffold's Geist fonts. Use at most this one family.

## 4. Responsive layout

Mobile-first. Media queries use `min-width` in `rem` so they respond to user zoom. CSS custom properties cannot be used in media queries, so use these literal values:

| Name | Query | Typical layout |
| --- | --- | --- |
| base | — | Single column, full-width cards, sticky bottom primary action on requester screens |
| `sm` | `(min-width: 40rem)` | Two-column product grid |
| `md` | `(min-width: 48rem)` | Manager: list and detail side by side when space allows |
| `lg` | `(min-width: 64rem)` | Manager: persistent side navigation; requester: product grid + basket side panel |
| `xl` | `(min-width: 80rem)` | Wider gutters only; content is capped at `--content-max` |

- Desktop layouts are designed, not stretched: use multi-column grids, side panels, and capped line lengths. Text lines never exceed about 75 characters.
- Requester screens are centered and capped at `--reading-max` for reading content; product grids may widen to 3–4 columns.
- Layout must reflow at 320 CSS px width without horizontal scrolling ([accessibility.md § 3](accessibility.md#3-visual-and-reading-requirements)).

## 5. Component patterns

Build these once in `src/components/ui/` and reuse them. Keep the set small.

| Component | Rules |
| --- | --- |
| **Button** | Variants: `primary`, `secondary`, `tertiary`, `danger`. Sizes: `md` (48px), `lg` (64px). At most one `primary` per region. Icon + text by default; icon-only only for universally understood actions on manager screens, always with an accessible name. |
| **Card** | Surface color, `--radius-lg`, `1px` border, `--shadow-sm` at most. Whole-card click targets are a single link or button, never nested interactive elements. |
| **Field** | Visible label above the input, optional hint, error below with an icon. Input height ≥ `--control-height`. |
| **Dialog** | Native `<dialog>` with `showModal()`. A title, one primary action, a clearly labelled cancel. Never for content that could be a page. |
| **Badge / Status** | Icon + text + color; never color alone. "Paid" and "Delivered" use different icons and wording ([payments.md § 8](payments.md#8-user-facing-states)). |
| **Navigation (manager)** | Up to four top-level items (Requests, Family, Devices, Account). Visible text tabs on mobile; side navigation at `lg`. No hamburger menu for four or fewer items. |
| **Navigation (requester)** | No menu. A persistent "Home" action and a "Back" action where needed. Help ("Ask {manager name}") is always in the same place. |
| **Inline message** | For errors, warnings, and confirmations that must stay visible. Toasts may supplement, never replace, an inline message. |

## 6. Interaction states

Every interactive component defines: default, hover (pointer devices only), active, `:focus-visible`, disabled, and loading.

- **Focus:** `outline: 3px solid var(--color-focus); outline-offset: 2px;` on `:focus-visible`. Never remove focus styles.
- **Loading (actions):** The button keeps its width, shows a spinner and a verb ("Sending…"), sets `aria-busy`, and ignores repeat presses.
- **Disabled:** Use sparingly. Do not disable a submit button to signal invalid input; let the user submit and show clear errors instead.
- **Pressed / selected** (for example, a product picked): checkmark icon + border change + text change ("Added"), not color alone.
- Transitions use `--duration-fast` or `--duration-base`, and are removed under `prefers-reduced-motion: reduce`.

## 7. Screen states

Each data-driven view designs all applicable states:

| State | Requirement |
| --- | --- |
| Loading | Skeleton with the same layout as the content, so nothing shifts. No full-page spinners after first load. |
| Empty | One sentence explaining why, and the next action as a button ("Add a family member"). |
| Error | What happened, in plain words, and a retry or way out. Keep user input. |
| Success | Clear confirmation with what happens next. |
| Partial | Show what loaded; degrade only the failing part. |

## 8. Requester-facing screens

- One task per screen, one primary action, at most three visible actions.
- Text: `--text-lg` body, `--text-2xl` titles, short sentences (see [accessibility.md § 6](accessibility.md#6-wording-and-cognitive-load)).
- Products are shown as large picture cards with the name and size in text.
- Primary actions use `lg` buttons, full width on mobile, in a consistent bottom position.
- No prices on requester screens unless the developer decides otherwise; totals are the manager's concern.
- No technical terms: avoid "session", "checkout", "authorize", "sync", "AI".

## 9. Icons

- Hugeicons only, rendered through `HugeiconsIcon` from `@hugeicons/react` with icons imported individually from `@hugeicons/core-free-icons`.
- Sizes: 20 (inline), 24 (buttons), 32 (cards), 48 (requester feature icons). One stroke width across the app.
- Decorative icons get `aria-hidden="true"`. Meaningful icons sit next to visible text.

## 10. Prohibited patterns

- Gradients, glassmorphism, blurred backdrops, floating circles or blobs, glow effects, neon accents
- "AI" sparkle motifs, purple-gradient AI branding, or presenting features as magic
- Generic dashboard look: KPI tiles, decorative charts, or data tables on requester screens
- Cramped layouts, text under 16px, gray-on-gray low-contrast text
- Carousels, auto-advancing content, infinite scroll, parallax
- Toast-only feedback for errors or payment results
- Emoji as interface elements
- Inline styles or one-off colors outside the tokens

## 11. Acceptance criteria

- [ ] All values come from tokens; no new colors were introduced without updating this document.
- [ ] Layout verified at 320px, 375px, 768px, 1024px, and 1440px widths, with no horizontal scrolling.
- [ ] Loading, empty, error, disabled, and success states exist where applicable.
- [ ] Each region has at most one primary action; requester screens have at most three actions.
- [ ] Status is communicated by icon, text, and color together.
- [ ] Nothing from §10 is present.
