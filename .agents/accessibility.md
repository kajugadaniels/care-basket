# Accessibility

**Purpose:** Make CareBasket usable by older adults, children, and people with limited technical experience, meeting WCAG 2.2 Level AA as a minimum.
**Applies to:** Any UI, copy, media, or interaction work. This document wins over [design.md](design.md) on any conflict.
**Related:** [design.md](design.md), [ai.md § 7](ai.md#7-voice-input), [testing.md § 6](testing.md#6-accessibility-checks)
**Last reviewed:** 2026-10-08

---

## 1. Principles

- **Design for a range, not a stereotype.** Do not assume older users have disabilities, or that all children read at the same level. Provide generous defaults and respect user settings (zoom, text size, reduced motion, screen readers).
- **Every task has more than one way.** Voice, typing, and pictures each work on their own. Nothing requires voice.
- **Nothing depends on memory, speed, or precision.** No timeouts that lose work, no small targets, no drag-only actions.

## 2. Target size and input

- Every interactive target is at least **48 × 48 CSS px**, with at least 8px between adjacent targets. Requester primary actions are **64px** tall. (WCAG 2.5.8 requires 24px; CareBasket deliberately exceeds it.)
- No action requires dragging, swiping, multi-finger gestures, long-press, or double-tap (WCAG 2.5.1, 2.5.7). Quantity changes use `−` and `+` buttons.
- Activation happens on release (`click`), so users can slide off to cancel (WCAG 2.5.2).
- Forms accept paste and support password managers and autofill on adult screens (WCAG 3.3.8).

## 3. Visual and reading requirements

| Requirement | Rule |
| --- | --- |
| Text contrast | ≥ 4.5:1 for all text (WCAG 1.4.3). Aim for 7:1 on requester screens. |
| Non-text contrast | ≥ 3:1 for control borders, icons that carry meaning, and focus indicators (WCAG 1.4.11). |
| Text size | Public and manager screens: 16px body; 14px (`--text-xs`) only for short secondary labels such as badges, captions, and metadata, never for paragraphs or instructions. Requester screens: 20px body (`--text-lg`), nothing below 18px. |
| Resize and zoom | Usable at 200% browser zoom and with large system text, without loss of content (WCAG 1.4.4). |
| Reflow | No horizontal scrolling at 320 CSS px width (WCAG 1.4.10). |
| Text spacing | Layout survives increased line, letter, and word spacing (WCAG 1.4.12). Do not fix heights on text containers. |
| Color | Never the only way to convey meaning (WCAG 1.4.1). Pair with icon and text. |
| Orientation | Works in portrait and landscape (WCAG 1.3.4). |
| Forced colors | Under `@media (forced-colors: active)`, borders and focus remain visible; do not rely on background colors alone. |

## 4. Keyboard and focus

- Every action is reachable and operable by keyboard in a logical order (WCAG 2.1.1, 2.4.3).
- Focus is always visible using the token-based ring in [design.md § 6](design.md#6-interaction-states) (WCAG 2.4.7).
- A focused element is never hidden behind sticky headers, footers, or banners (WCAG 2.4.11). Use `scroll-padding` for sticky regions.
- Dialogs trap focus while open, return focus to the trigger on close, and close with `Escape`. Use native `<dialog>` with `showModal()`.
- After navigation or a major state change, move focus to the new page heading or to the result message.
- A "Skip to main content" link is the first focusable element on manager layouts.

## 5. Semantics and screen readers

- Use semantic HTML first: `header`, `nav`, `main`, `footer`, `h1`–`h3` in order, `ul`/`li` for lists, `button` for actions, `a` for navigation, `fieldset`/`legend` for groups.
- One `h1` per page, which matches the page purpose. Set a unique `<title>` per route via `metadata`.
- Every input has a visible `<label>`. Hints and errors are linked with `aria-describedby`; invalid fields set `aria-invalid="true"`.
- Status changes are announced through a polite live region: recording started or stopped, "Understanding your list…", items added, "Sent to Anna", payment status. Use `role="alert"` only for errors that need immediate attention.
- Product images have `alt` text equal to the product name and size. Decorative images and icons use `alt=""` or `aria-hidden="true"`.
- Prefer native elements over ARIA. Any custom widget follows the WAI-ARIA Authoring Practices pattern for its role.
- `<html lang>` is set from the active locale.

## 6. Wording and cognitive load

Requester screens:

- Short sentences, everyday words, about a 5th-grade reading level. One idea per sentence.
- Instructions are at most about eight words ("Tap the mic and say what you need.").
- Use people's names and plain verbs: "Send to Anna", not "Submit request".
- Avoid jargon: never "session", "authenticate", "checkout", "payload", "AI model", "error code".
- Show, don't ask: CareBasket shows what it understood as picture cards rather than asking the user to read a list.
- Help is always in the same place on every screen (WCAG 3.2.6): an "Ask {manager name}" action that explains how to get help.
- Never ask for the same information twice in one flow (WCAG 3.3.7).

All screens:

- Consistent labels for the same action everywhere (WCAG 3.2.4).
- Confirm before destructive actions; offer undo for removals ("Removed milk. Undo").
- No time limits that lose work. If a limit exists (for example, voice recording length or a pairing code), show it, warn before it ends, and allow restarting without losing what was done (WCAG 2.2.1).

## 7. Voice, audio, and feedback

- Voice is optional. Text input and picture selection are always visible alternatives, and are the default when the microphone is unavailable or permission is denied ([ai.md § 7](ai.md#7-voice-input)).
- Recording never starts automatically. A large, labelled button starts and stops it; a visible timer and a visual "listening" indicator show progress.
- Any sound (for example, a start or stop tone) has a visual equivalent and respects the device's mute state. No audio plays automatically for more than three seconds (WCAG 1.4.2).
- Show the transcript or understood text so users who cannot hear or who misspoke can check it.

## 8. Errors and recovery

- Errors say what happened and what to do next, in plain words, without blame: "We couldn't hear that. Try again, or type your list."
- Errors appear next to the cause and in a summary for forms with several fields (WCAG 3.3.1, 3.3.3).
- User input is preserved after any error.
- Connection or service failures offer a retry and a non-AI alternative (pictures).
- Requesters never see technical errors, codes, or payment failures. They see a calm status and a way to get help.

## 9. Language and localization readiness

- The MVP is English. Code stays ready for other languages:
  - User-facing strings live in each feature's `copy.ts`, not inline in components.
  - No string concatenation for sentences; use template functions with named parameters.
  - Format numbers, currency, and dates with `Intl.NumberFormat`, `Intl.DateTimeFormat`, and plurals with `Intl.PluralRules`, all via `src/lib/format.ts`.
  - No text inside images.
  - Use CSS logical properties so right-to-left layouts can be added later.
- Profiles store a `locale` (default `en`) for future use.

## 10. Motion

- Respect `prefers-reduced-motion: reduce`: remove non-essential transitions and animations.
- No flashing content (WCAG 2.3.1). No parallax or auto-playing animation.
- Motion never carries meaning on its own.

## 11. Prohibited patterns

- Voice-only or picture-only mandatory paths
- Placeholder text used as a label
- `outline: none` without an equivalent visible focus style
- Disabled zoom (`user-scalable=no`, `maximum-scale=1`)
- Hover-only information or controls
- Icon-only buttons on requester screens
- CAPTCHAs or memory or transcription tests for requesters
- Auto-dismissing messages for errors or payment outcomes

## 12. Acceptance criteria

- [ ] Full flow completed using keyboard only, with visible focus throughout.
- [ ] Flow completed with VoiceOver (iOS or macOS) and TalkBack (Android), with sensible announcements.
- [ ] Usable at 200% zoom and at 320px width without horizontal scrolling.
- [ ] All text and UI contrast verified with a checker.
- [ ] Touch targets ≥ 48px; requester primary actions 64px.
- [ ] Every voice step has a working text or picture alternative.
- [ ] Reduced-motion setting removes animations.
- [ ] Requester copy reviewed against §6.
