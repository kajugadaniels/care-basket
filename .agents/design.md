# Visual Design

**Purpose:** Give CareBasket a clean, confident, premium interface inspired by the clarity of PayPal's modern design, while keeping its own identity, meeting WCAG 2.2 AA, and working on every screen size.
**Applies to:** Any UI work.
**Related:** [accessibility.md](accessibility.md) (which wins on any conflict), [performance.md](performance.md), [folder-structure.md](folder-structure.md), [payments.md § 9](payments.md#9-claims-we-must-never-make)
**Last reviewed:** 2026-10-08

---

## 1. Principles, references, and brand separation

### 1.1 Principles

1. **Advanced intelligence behind the scenes. Extremely simple experiences for people.**
2. **Clarity over decoration.** Neutral white surfaces, one deep blue for action, generous whitespace.
3. **One main action per screen region**, obvious within one second.
4. **Same pattern, same meaning** everywhere.
5. **Two audiences, one system.** Requester and manager interfaces are designed separately (§8, §9) on shared tokens and components.

### 1.2 Design references and research limits

| Reference | Accessed 2026-10-08 | What we took |
| --- | --- | --- |
| Mobbin, PayPal mobile screens | **Not accessible** (HTTP 403; the screen library requires sign-in) | Nothing. No Mobbin screens were inspected. The developer may review them with an account and record findings here. |
| Pentagram, PayPal identity (https://www.pentagram.com/work/paypal/story) | Yes | Principles "simplicity, optimism and trust"; a neutral black-and-white base with blues as accents; a bold, confident geometric typeface (PayPal Pro, derived from LL Supreme and Futura) |
| paypal.com | Yes | Short, bold headlines; action-oriented button labels; grouped offer cards; progressive disclosure with details kept out of the main flow |
| PayPal newsroom media resources | Yes | No usable design guidelines published there; assets are media resources |
| PayPal blue values `#003087` and `#009CDE` | Secondary sources only | Used as inspiration; not verified against an official PayPal guideline |

CareBasket's interpretation: white base, deep blue for primary actions, bright blue used sparingly, large bold headlines, pill-shaped buttons, calm cards, single-purpose confirmation screens, and details revealed only when asked for.

### 1.3 Brand separation (mandatory)

- CareBasket keeps its own name, wordmark, and product identity. Never use PayPal's logos, monogram, wordmark shapes, proprietary fonts (PayPal Pro), illustrations, icons, screenshots, or complete screen layouts.
- Never imply that PayPal operates, sponsors, or endorses CareBasket. A footer line on public pages states: "CareBasket is an independent project and is not affiliated with or endorsed by PayPal."
- PayPal's name and marks appear only where payment happens, through the **official PayPal payment components** and factual labels ("Paid with PayPal", "PayPal Sandbox"). Do not restyle or imitate PayPal buttons.
- Because CareBasket's palette is inspired by PayPal's blues, the CareBasket wordmark, its own iconography, and the disclaimer must make the distinction obvious.

## 2. Styling rules

- Component styles live in a colocated CSS Module. `src/app/globals.css` contains only the reset, design tokens, base element styles (`html`, `body`, headings, links, focus, media), and reduced-motion and forced-colors rules.
- Every value comes from a token: color, spacing, radius, shadow, font, size, duration. Raw hex values or pixel spacing in CSS Modules are prohibited, except `1px` borders and media-query breakpoints.
- Use logical properties (`margin-inline`, `padding-block`).
- Size text with `rem`; never set `html { font-size }` in `px`.
- One light theme for the MVP (`color-scheme: light`), with no automatic dark-mode override. Token names are semantic so a dark theme can be added later without touching components.
- No Tailwind, CSS-in-JS, or UI kits ([architecture.md § 1](architecture.md#1-approved-stack)).

## 3. Design tokens

Implemented in `src/app/globals.css`. A contrast test (`src/app/design-tokens.test.ts`) checks the pairs below; update both when a value changes.

### 3.1 Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#003087` | Primary buttons, links, active navigation, selected borders, focus ring |
| `--color-primary-hover` | `#00246A` | Hover and pressed state of primary |
| `--color-on-primary` | `#FFFFFF` | Text and icons on primary |
| `--color-accent` | `#009CDE` | **Decorative only** (thin highlights, illustration accents) on white. Never text, never a button fill, never the only indicator. |
| `--color-accent-strong` | `#00609F` | Accent-colored text and icons on light surfaces; info states |
| `--color-text` | `#111111` | Main text |
| `--color-text-muted` | `#4B5563` | Secondary text |
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-surface` | `#FFFFFF` | Cards and dialogs |
| `--color-surface-soft` | `#F6F8FB` | Sections, panels, product image tiles |
| `--color-surface-accent` | `#E6F4FA` | Highlighted panels, info backgrounds, selected rows |
| `--color-border` | `#D9DEE7` | Decorative dividers only |
| `--color-border-strong` | `#6B7686` | Input and control borders |
| `--color-focus` | `#003087` | Focus ring (3px, 2px offset) |
| `--color-success` / `-bg` | `#137333` / `#E7F5EC` | Paid, confirmed, done |
| `--color-warning` / `-bg` | `#7A4E00` / `#FFF4DB` | Pending, needs attention, demo labels |
| `--color-danger` / `-bg` | `#B42318` / `#FDECEB` | Errors, destructive actions |
| `--color-info` / `-bg` | `#00609F` / `#E6F4FA` | Neutral information |

The neutral and surface values are CareBasket choices, not claims about PayPal's UI tokens.

### 3.2 Verified contrast (WCAG 2.x formula, computed 2026-10-08)

| Pair | Ratio | Result |
| --- | --- | --- |
| Text `#111111` on white / soft / accent surface | 18.9 / 17.8 / 16.8 | Pass AAA |
| Primary `#003087` on white / soft / accent surface | 11.9 / 11.1 / 10.5 | Pass AAA |
| White on primary `#003087` | 11.9 | Pass AAA |
| Muted `#4B5563` on white / soft / accent surface | 7.6 / 7.1 / 6.7 | Pass AA (AAA on white) |
| Accent-strong `#00609F` on white / accent surface | 6.6 / 5.9 | Pass AA |
| Border-strong `#6B7686` on white / soft / accent surface | 4.6 / 4.3 / 4.1 | Pass 3:1 for UI components |
| Success `#137333` on white / its background | 6.0 / 5.3 | Pass AA |
| Warning `#7A4E00` on white / its background | 7.2 / 6.6 | Pass AA |
| Danger `#B42318` on white / its background | 6.6 / 5.8 | Pass AA |
| **Accent `#009CDE` on white / soft surface** | **3.1 / 2.9** | **Fails for text; borderline for UI**, hence decorative only |
| **White on accent `#009CDE`** | **3.1** | **Fails for normal text**, so never a button fill |

### 3.3 Typography

**Decision:** DM Sans is the primary interface typeface, and Atkinson Hyperlegible Next is kept for requester reading text.

- **DM Sans** (SIL Open Font License, via `next/font/google`, variable weight and optical size) is a legally available alternative with a geometric character similar in spirit to PayPal's typeface. **It is not PayPal's proprietary font.** Used for headings, buttons, navigation, and all manager screens.
- **Readability concern:** like most geometric sans serifs, DM Sans draws capital `I` and lowercase `l` alike and has rounder, more similar letter shapes. Atkinson Hyperlegible Next was designed for low-vision readers and distinguishes these characters. Older adults and early readers are CareBasket's core requesters, so their reading text keeps it.
- **Atkinson Hyperlegible Next** (`--font-readable`): requester body text, product names and sizes, quantities, clarification questions, status messages, and the device pairing code. It is loaded without preload, so screens that do not use it never download it.

| Token | Value | Use |
| --- | --- | --- |
| `--font-sans` | DM Sans, system fallback | Interface and headings |
| `--font-readable` | Atkinson Hyperlegible Next, then `--font-sans` | Requester reading text |
| `--text-sm` | 1rem (16px) | Manager metadata; the minimum anywhere |
| `--text-base` | 1.125rem (18px) | Default body |
| `--text-lg` | 1.375rem (22px) | Requester body, card titles |
| `--text-xl` | 1.75rem (28px) | Manager page titles |
| `--text-2xl` | 2.25rem (36px) | Requester page titles |
| `--text-display` | 3rem (48px) | Welcome headline, pairing code, payment confirmation amount |
| `--leading-body` / `--leading-tight` | 1.5 / 1.2 | Body / headings |
| `--tracking-tight` | -0.01em | Headings 28px and larger only |
| Weights | 400 regular, 500 medium, 600 semibold, 700 bold | Body 400; labels and buttons 600; headings 700 |

Rules: no light weights (below 400) for text; no all-caps sentences; tabular numerals (`font-variant-numeric: tabular-nums`) for prices, quantities, and codes.

### 3.4 Space, shape, depth, motion

| Token | Value |
| --- | --- |
| `--space-1` … `--space-8` | 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4 rem |
| `--gutter` | `clamp(1rem, 4vw, 2rem)`, page side padding |
| `--radius-sm` / `-md` / `-lg` / `-full` | 8px / 12px / 20px / 999px (pill buttons) |
| `--shadow-sm` | `0 1px 2px rgb(17 17 17 / 0.06)`, for cards on soft surfaces only |
| `--shadow-md` | `0 8px 24px rgb(17 17 17 / 0.12)`, for dialogs and menus only |
| `--control-height` / `-lg` | 3rem (48px) / 4rem (64px) |
| `--content-max` / `--reading-max` | 72rem / 40rem |
| `--duration-fast` / `-base`, `--ease-standard` | 120ms / 200ms, `cubic-bezier(0.2, 0, 0, 1)` |
| `--z-header` / `-dialog` / `-toast` | 10 / 100 / 200 |

## 4. Responsive layout

Mobile-first. Media queries use `min-width` in `rem` (literal values, since custom properties cannot be used in queries):

| Name | Query | Requester interface | Manager interface |
| --- | --- | --- | --- |
| base | — | Single column; 2-column product grid; sticky bottom action | Single column; bottom navigation bar |
| `sm` | `(min-width: 40rem)` | 3-column product grid | Cards in 2 columns where useful |
| `md` | `(min-width: 48rem)` | Product grid with larger images | List and detail side by side for requests |
| `lg` | `(min-width: 64rem)` | 4-column grid plus a sticky basket side panel | Left side navigation; list (about 22rem) + detail panel |
| `xl` | `(min-width: 80rem)` | Wider gutters; content capped | Optional third column for history or reference prices; capped at `--content-max` |

- Desktop layouts are designed, not stretched: grids, side panels, and capped line lengths (about 75 characters). Never stretch a single mobile card to full desktop width.
- Layout reflows at 320 CSS px with no horizontal scrolling ([accessibility.md § 3](accessibility.md#3-visual-and-reading-requirements)).

## 5. Component patterns

Build these once in `src/components/ui/` and reuse them.

| Component | Rules |
| --- | --- |
| **Button** | Pill-shaped (`--radius-full`), clearly labelled with text (icon optional). Variants: `primary` (filled `--color-primary`), `secondary` (white with `--color-primary` 2px border and text), `tertiary` (text button), `danger`. Sizes `md` (48px) and `lg` (64px). At most one `primary` per region. |
| **Card** | `--color-surface`, `--radius-lg`, `1px` `--color-border`; `--shadow-sm` only on soft backgrounds. A whole-card target is a single link or button, never nested interactive elements. |
| **Product card** | Large square image on `--color-surface-soft` (at least 50% of card height), name and size in `--font-readable`, quantity stepper with − and + buttons (48px), badges for "Suggested" and "Substitute". Missing photo: large category icon tile. |
| **Field** | Visible label above, optional hint, error below with an icon; `1px` `--color-border-strong`, `--radius-md`, height at least `--control-height`. |
| **Dialog** | Native `<dialog>` with `showModal()`, a title, one primary action, a clearly labelled cancel, `--shadow-md`. Never for content that could be a page. |
| **Status badge** | Icon + text + tinted background (`-bg` tokens). "Paid" and "Delivered" use different icons, words, and positions ([payments.md § 8](payments.md#8-user-facing-states)). "Demo price" uses the warning tint. |
| **Confirmation screen** | One large status icon, one headline, the key fact (for example the amount), secondary details below, one primary next action. Used for payment results and sent requests. |
| **Navigation (manager)** | Bottom bar with up to four items (icon + label) on small screens; left side navigation from `lg`. No hamburger menus. |
| **Navigation (requester)** | No menu. A persistent **Home** action, **Back** where needed, and help ("Ask {manager name}") always in the same place. |
| **Inline message** | Errors, warnings, and confirmations that must stay visible. Toasts may supplement, never replace, them. |

## 6. Interaction states

Every interactive component defines: default, hover (pointer devices only), active, `:focus-visible`, disabled, and loading.

- **Focus:** `outline: 3px solid var(--color-focus); outline-offset: 2px;` on `:focus-visible`. Never removed.
- **Loading (actions):** the button keeps its width, shows a spinner and a verb ("Sending…"), sets `aria-busy`, and ignores repeat presses.
- **Disabled:** used sparingly; never to signal invalid input.
- **Selected** (for example, a chosen clarification option): 2px `--color-primary` border, checkmark icon, and changed text ("Chosen"), never color alone.
- Transitions use `--duration-fast` or `--duration-base` on `opacity`, `transform`, `background-color`, and `border-color` only, and are removed under `prefers-reduced-motion: reduce`.

## 7. Screen states

| State | Requirement |
| --- | --- |
| Loading | Skeleton with the final layout, so nothing shifts. No full-page spinners after first load. |
| Empty | One sentence explaining why, and the next action as a button ("Add a family member"). |
| Error | What happened in plain words, plus retry or a way out. Input is kept. |
| Success | A confirmation screen or inline message saying what happens next. |
| Partial | Show what loaded; degrade only the failing part. |

## 8. Requester interface (assisted adults and children)

What they see:

- **Welcome:** "Hi, Rose" in `--text-display`, and one prominent **Start my list** button (`lg`, full width on phones).
- **Ways to ask:** **Speak** (a large 96px circular microphone button with a visible label, shown only where AI voice is permitted, see [ai.md § 8](ai.md#8-profiles-children-and-tone)), **Type**, and **Pictures**. Pictures is always available.
- **Pictures:** large category tiles, then large product cards.
- **Clarification:** one short question with 2–4 large picture options.
- **Review:** basket cards, "Suggested for you" shown separately, simple − and + controls.
- **Confirm:** a single list and **Send to Anna**.
- **Status:** plain-language cards ("Sent to Anna", "Anna paid for your shopping", "Delivery: not arranged yet (demo)").

What they never see: dashboards, charts, finance terms, payment controls, PayPal buttons, transaction IDs, technical errors, or item prices. The only exception is a plain estimated total when an assisted adult set a budget for that request ("About $18.40 with demo prices, within your $20").

Rules: one task per screen, at most three visible actions, `--text-lg` body in `--font-readable`, `--text-2xl` titles, and words without jargon ([accessibility.md § 6](accessibility.md#6-wording-and-cognitive-load)).

## 9. Manager interface

The manager can create profiles, authorize devices, review requests, inspect products and prices, edit or decline, pay with PayPal, and review history.

- **Requests (home):** incoming requests first, as cards (requester avatar and name, item count, demo total, time, status badge). From `md`, a list-and-detail layout.
- **Request detail:**
  - Items, each with image, name, size, demo price, quantity stepper, and line total.
  - Badges for "Suggested" and "Substitute".
  - The requester's stated budget, if any.
  - Optionally, an Open Prices reference price, clearly labelled ([catalog.md § 6](catalog.md#6-observed-prices-vs-demo-merchant-prices)).
  - The total, then actions: the **official PayPal button**, **Decline**, and **Edit**.
- **Payment confirmation:** the confirmation screen pattern with the amount, "Paid with PayPal (Sandbox)", date, and transaction ID, and a separate delivery status card marked as demo.
- **Profiles and Devices:** card grids (1, 2, then 3 columns), each with a clear primary action (Add a family member, Connect a device, Revoke).
- **History:** a simple list filterable by status, paginated.
- **Width:** content capped at `--content-max`; forms at `--reading-max`.

## 10. Icons and imagery

- Hugeicons only (`HugeiconsIcon` from `@hugeicons/react`, icons imported individually from `@hugeicons/core-free-icons`). Sizes 20, 24, 32, 48, and 64 for requester feature icons; one stroke width.
- Decorative icons get `aria-hidden="true"`; meaningful icons sit next to visible text.
- Product images come only from the curated catalog with recorded licenses ([catalog.md § 9](catalog.md#9-images)), served through `next/image`.
- No stock illustrations of people, no AI-generated imagery, no PayPal imagery.

## 11. Prohibited patterns

- Gradients, glassmorphism, blurred backdrops, decorative circles or blobs, glow effects, neon accents
- Heavy or stacked shadows; shadows on every card
- "AI" sparkle motifs or presenting features as magic; chat-style bubbles with long paragraphs
- Generic dashboard look: KPI tiles, decorative charts, or data tables on requester screens
- Cramped layouts, text under 16px, low-contrast gray text, `--color-accent` used for text or button fills
- Carousels, auto-advancing content, infinite scroll, parallax, unnecessary animation
- Toast-only feedback for errors or payment results
- PayPal logos, fonts, screenshots, or copied screens; anything implying PayPal endorsement
- Emoji as interface elements; inline styles or colors outside tokens

## 12. Acceptance criteria

- [ ] All values come from tokens; any new color is added to §3 with a verified contrast ratio and a test pair.
- [ ] Layout verified at 320px, 375px, 768px, 1024px, and 1440px with no horizontal scrolling, and with desktop-specific layouts from `lg`.
- [ ] Loading, empty, error, disabled, and success states exist where applicable.
- [ ] Requester screens have one main action, at most three actions, `--font-readable` reading text, and no prices except the budget line.
- [ ] Status uses icon, text, and color together; "Paid" and "Delivered" are visually distinct.
- [ ] No PayPal brand assets outside official payment components; the independence disclaimer is present on public pages.
- [ ] Nothing from §11 is present.
