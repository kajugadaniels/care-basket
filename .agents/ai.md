# AI-Assisted Shopping and Voice

**Purpose:** Define what CareBasket's AI does and must never do, the full request workflow and its states, how outputs are grounded in the catalog and validated, and how voice, clarification, budgets, and audiences are handled.
**Applies to:** Anything touching AI, transcription, catalog matching, suggestions, budgets, or voice capture.
**Related:** [catalog.md](catalog.md), [privacy.md](privacy.md), [security.md](security.md), [accessibility.md § 7](accessibility.md#7-voice-audio-and-feedback), [api.md § 3](api.md#3-route-handlers), [testing.md](testing.md)
**Last reviewed:** 2026-10-08

---

## 1. Role of AI

**Advanced intelligence behind the scenes. Extremely simple experiences for people.**

AI turns what a person says or types into a **proposal**: catalog products with quantities, some explicitly requested and some suggested. The requester confirms the proposal; the server prices it with demo merchant prices; a family manager decides whether to pay. AI interprets and suggests. It never decides, prices, or pays.

## 2. Approved capabilities

| ID | Capability | Example | What AI does | Available to |
| --- | --- | --- | --- | --- |
| A | **Voice-to-shopping** | "I need two kilos of rice, one litre of milk, and three bars of soap." | Transcribes a short recording, extracts item names, amounts, and units, matches catalog SKUs | Assisted adults with AI enabled |
| B | **Context-aware shopping** | "My grandchildren are coming tomorrow. I want to prepare breakfast for four people." | Understands the occasion, suggests suitable catalog items and reasonable quantities, all marked as **suggestions** | Assisted adults with AI enabled |
| C | **Catalog-grounded results** | Every request | Selects only SKUs from the supplied catalog; never invents products, prices, stock, stores, discounts, or delivery times | Every AI output |
| D | **Simple clarification** | "I need milk." → "Which size would you like?" with picture options | Asks one short question when unsure; the server builds the options from the catalog | Every interaction; children get non-AI picture choices |
| E | **Budget-aware suggestions** | "Breakfast things, but I only have $20." | Extracts the stated budget and ranks items as essential or optional; the **server** prices and fits the basket | Assisted adults with AI enabled |
| F | **Audience-aware behaviour** | — | No Gemini for children; minimal, anonymous context for adults | See §8 |

Text input is always an alternative to voice, and picture selection is always available without AI.

## 3. What AI must not do

- Invent or select products outside the supplied catalog; create, edit, or price catalog records.
- See, state, or estimate prices, totals, discounts, stock, stores, or delivery times. Prompts contain **no prices**.
- Authorize, initiate, or capture payments, or start checkout. AI output has no path to any payment code.
- Present suggestions or assumptions as things the person asked for.
- Submit a request. Only the requester's explicit confirmation submits.
- See or reveal personal data: names, ages, family details, other requests, payment or device data.
- Hold open-ended conversations, give advice (medical, dietary, financial), or answer unrelated questions.
- Enforce or remember budgets beyond the single current request.
- Call tools or functions, or produce anything other than the validated JSON in §6.

## 4. Provider abstraction

Integration code lives in `src/lib/ai/` (server-only). Feature logic (grounding, units, budgets, clarification, limits) lives in `src/features/assistant/server/`.

```ts
// src/lib/ai/provider.ts
export interface ShoppingAssistantProvider {
  interpret(input: InterpretInput): Promise<unknown>; // raw JSON; validated by the caller with Zod
}

type CatalogEntryForAi = {
  sku: string; name: string; sizeLabel: string; category: string; variantGroup: string; synonyms: string[];
};
type InterpretInput = {
  request: { kind: 'text'; text: string } | { kind: 'audio'; audio: Uint8Array; mimeType: SupportedAudioMimeType };
  catalog: CatalogEntryForAi[];
  locale: string;               // 'en-US'
  audience: 'assisted_adult';   // children never reach the provider (§8)
};
```

- `src/lib/ai/gemini/` implements the interface with `@google/genai` (`GoogleGenAI`). A fake implementation for tests lives next to the tests. `getShoppingAssistant()` selects the provider; swapping providers changes no feature code.
- The model ID comes from `GEMINI_MODEL`. Choose a fast, cost-efficient current model that supports audio input and JSON-schema output; never hard-code model names elsewhere.
- **The Gemini API evolves quickly.** Before writing provider code, read the current official Gemini documentation for the installed `@google/genai` version (the Gemini docs MCP server or ai.google.dev). Use the SDK's current structured-output configuration with a JSON Schema generated from the Zod schema (`z.toJSONSchema`).
- Low temperature, no streaming, no tools, no conversation history.
- **Not implemented yet.** This document specifies it; implementation is a later task.

## 5. Request workflow and states

### 5.1 End-to-end flow

1. The requester taps **Start my list** and sees three choices: **Speak**, **Type**, **Pictures**. Pictures never needs AI.
2. Capture: voice (at most 60 seconds) or text (at most 500 characters).
3. The server resolves the device actor, checks that the profile is an `ASSISTED_ADULT` with AI enabled (§8), applies rate limits, and validates input.
4. The server loads the active catalog summary (cached; contains no personal data and no prices).
5. One provider call returns raw JSON, which is validated with Zod (§6).
6. The assistant service grounds SKUs, resolves sizes and pack counts, merges duplicates, applies confidence rules, builds clarifications, and fits any budget with demo prices (§6, §10).
7. The requester sees what was understood: "I heard: …", requested items as large picture cards, suggested items in a separate **Suggested for you** group, one clarification at a time, and anything not understood.
8. The requester adjusts: answers clarifications by tapping, removes items, changes quantities with − and +, adds from pictures, or taps **Say more** (a new interpretation merged into the draft).
9. **Confirmation:** "Send these 7 things to Anna?" lists everything, with suggestions still marked. Only **Send** submits.
10. `submitRequestAction` re-validates every SKU and quantity, snapshots demo prices, stores each item's origin (`REQUESTED` or `SUGGESTED`), any budget, and the input text, then hands off to manager review ([payments.md § 3](payments.md#3-payment-workflow)). AI plays no further part.

### 5.2 Assistant states

| State | Requester sees | Leaves to |
| --- | --- | --- |
| `idle` | Speak / Type / Pictures | `listening`, `typing`, picture browsing |
| `listening` | Listening indicator, timer, Stop | `interpreting`, `idle` (cancel) |
| `typing` | Large text field, Continue | `interpreting` |
| `interpreting` | "Understanding your list…"; after 6 seconds also "Still working…" and **Use pictures instead** | `reviewing`, `clarifying`, `fallback` |
| `clarifying` | One short question with 2–4 picture options and "None of these" | next clarification, `reviewing` |
| `reviewing` | Basket cards, suggestions, edit controls, Say more, Continue | `confirming`, `listening`, `typing` |
| `confirming` | Final list and **Send to {manager}** | `submitted`, `reviewing` |
| `submitted` | "Sent to Anna. She'll look at it soon." | — |
| `fallback` | Calm message, typed text kept, picture browsing open | `reviewing` |

The draft lives in client state until submission; nothing is stored server-side before **Send**.

## 6. Catalog grounding and matching

### 6.1 Output schema

The provider must return JSON matching this schema, and the response is **always** re-validated with Zod, whatever the provider promises:

```ts
const unitSchema = z.enum(['count', 'pack', 'dozen', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'fl_oz', 'qt', 'gal']);

const interpretationSchema = z.strictObject({
  transcript: z.string().max(1000).nullable(),               // voice only
  intent: z.enum(['list', 'occasion', 'mixed', 'not_shopping']),
  items: z.array(z.strictObject({
    sku: z.string().max(60).nullable(),                      // must exist in the supplied catalog
    requestedText: z.string().max(80),                       // the person's words
    origin: z.enum(['requested', 'suggested']),
    amount: z.number().positive().max(100).nullable(),       // as spoken: 2 (kilos)
    unit: unitSchema.nullable(),
    packCount: z.int().min(1).max(20).nullable(),            // used when no amount/unit
    priority: z.enum(['essential', 'optional']),
    confidence: z.enum(['high', 'medium', 'low']),
    substitutionReason: z.string().max(120).nullable(),
  })).max(30),
  occasion: z.strictObject({ summary: z.string().max(80), people: z.int().min(1).max(20).nullable() }).nullable(),
  statedBudget: z.strictObject({ amount: z.number().positive().max(1000), currency: z.literal('USD') }).nullable(),
  clarification: z.strictObject({
    question: z.string().max(100),
    optionSkus: z.array(z.string().max(60)).min(2).max(4),
  }).nullable(),
  unrecognized: z.array(z.string().max(80)).max(10),
});
```

### 6.2 Server processing (assistant service)

1. **Ground:** drop any SKU not in the supplied catalog and move its text to `unrecognized`. Products, names, images, and sizes come from the database, never from AI text.
2. **Resolve size and quantity** (`units.ts`, deterministic):
   - Convert spoken amounts to base units: grams, milliliters, or count (`lb` = 453.592 g, `oz` = 28.3495 g, or fluid ounces when the product is liquid, `fl_oz` = 29.5735 mL, `qt` = 946.353 mL, `gal` = 3,785.41 mL, `dozen` = 12).
   - Within the product's `variantGroup`, choose the size and whole-pack count that meets the amount with the least excess (ties: fewer packs).
   - If no option lands within 25% of the request, or no amount was given and the group has several sizes, queue a size clarification.
   - Example: "two kilos of rice" with a 2 lb (907 g) bag becomes 3 bags, shown as "3 bags (about 2.7 kg)" with a "Is this right?" marker.
   - Example: "three bars of soap" with single bars and a 4-pack becomes 3 single bars.
   - Pack counts are capped at 20 per item.
3. **Merge** duplicate SKUs by summing quantities (cap 20).
4. **Suggestions** (`origin: 'suggested'`): at most 12 suggested items per interpretation, at most 6 packs each. They are displayed separately, labelled "Suggested", removable with one tap, and visible to the manager as suggestions.
5. **Confidence and clarification** (§10).
6. **Budget fitting** (§10).
7. Return a requester DTO: picture cards (name, size label, image, quantity, origin, confidence marker), the clarification queue, unrecognized phrases, and, only when a budget was given, the estimated total in plain words.

Catalog context sent to the model: all active products as `CatalogEntryForAi` (about 150 entries, compact). If the catalog grows past about 200 products, pre-filter by category on the server.

## 7. Voice input

Voice is optional. Text and picture selection are always available ([accessibility.md § 7](accessibility.md#7-voice-audio-and-feedback)).

Client (a small Client Component in `features/assistant/components/`):

- Request microphone permission only when the user taps **Speak**. If permission is denied, the API is unsupported, the context is not secure, or the profile cannot use AI, hide the microphone and show text and pictures with a short, friendly explanation.
- Record with `MediaRecorder`, choosing the first supported type from `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg;codecs=opus` via `MediaRecorder.isTypeSupported`.
- Maximum **60 seconds**: show a timer, warn in the last 10 seconds, stop automatically, and keep what was recorded.
- Show clear listening, processing, and done states, announced through a live region.
- Upload to `POST /api/assistant/voice` as `multipart/form-data`.

Server (Route Handler → assistant service):

- Require a device session for an `ASSISTED_ADULT` profile with AI enabled (§8), check the `Origin` header, and apply rate limits ([security.md § 8](security.md#8-rate-limiting-and-brute-force-protection)).
- Reject bodies over **2 MB** (413) and MIME types outside the allow-list (415): `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/m4a`, `audio/aac`, `audio/mpeg`, `audio/wav`. Map each to a type that the current Gemini docs list as supported (WebM, OGG, M4A, AAC, MP3, and WAV are listed today). Verify Safari's `audio/mp4` recordings end to end.
- Send audio inline. Transcription and interpretation happen in **one** structured call that returns `transcript` plus the interpretation.
- **Never persist audio.** Do not write it to disk, the database, logs, or caches; drop references after the call.
- Return the transcript so the requester can check what was heard.

## 8. Profiles, children, and tone

### 8.1 Assisted adults

- AI is used only when the manager has turned on **Voice and smart suggestions** for the profile and confirmed: "{Name} agrees that their shopping requests may be processed by Google's AI service to understand them." Store `aiAssistEnabled`, `aiConsentConfirmedAt`, and `aiConsentVersion`. It is off by default.
- The requester sees a one-line notice next to **Speak** and **Type**: "Google AI helps us understand your list. We don't keep recordings."
- The provider receives only the request, the catalog summary, `locale`, and `audience`. Never names, ages, family details, or history.

### 8.2 Children

- **Children and Gemini (open compliance issue).** The Gemini API Additional Terms of Service (https://ai.google.dev/gemini-api/terms, checked 2026-10-08) state that the Services must not be used as part of an application "directed towards or … likely to be accessed by individuals under the age of 18." Until the developer resolves this:
  - `CHILD` profiles MUST NOT trigger any Gemini call: no voice, no AI text interpretation, no budget feature.
  - Child devices use picture selection, plus the deterministic keyword match for typed words (§12), and clarifications use non-AI picture choices built from `variantGroup`.
  - No information about a child is ever sent to Gemini.
  - Whether the app as a whole may use Gemini while child profiles exist is a **developer decision**, which may mean removing child profiles from the public demo or choosing a different provider. Record the decision here.
- The catalog excludes age-restricted, medical, and hazardous products for everyone ([catalog.md § 7](catalog.md#7-normalization)).

### 8.3 Tone

Warm, short, and plain. Questions are at most 100 characters. No emoji, no exclamation-heavy enthusiasm, no claims about prices, stock, or delivery. Suggestions are phrased as offers ("Would you like eggs too?"), never as facts.

## 9. Prompt injection and output safety

- System instructions are fixed in code (`src/lib/ai/prompts.ts`) and never built from user input.
- User text, transcripts, **and catalog text** are untrusted. Catalog names come from crowdsourced data; they are curated, length-limited, and stripped of control characters before use. All of them are wrapped in clearly delimited blocks described to the model as data, not instructions.
- The model has **no tools**, and its only output is schema-constrained JSON. Unknown fields are rejected by `z.strictObject`.
- Clarification text is rejected and replaced with the template "Which one would you like?" if it contains currency symbols or amounts, URLs, or more than 100 characters. Option labels are always built by the server from catalog data.
- The output can only yield a proposal of existing catalog SKUs. It cannot change prices, trigger payments, read data, or reach other families. Even a successful injection can at most propose wrong catalog items, which both the requester and the manager see before any payment.
- AI-generated text is rendered as plain text, never as HTML or Markdown.

## 10. Clarification, confidence, and budgets

### 10.1 Confidence

| Confidence | Behaviour |
| --- | --- |
| `high` | Added to the proposal |
| `medium` | Added, with a visible "Is this right?" marker the requester can tap to change |
| `low` | Not added; becomes a clarification when options exist, otherwise listed under "I didn't catch" |

### 10.2 Clarification

- **One question at a time.** Queue at most three (the AI's one plus server-generated size questions); beyond that, use the best default with an "Is this right?" marker.
- Each question shows 2–4 large picture options with server-built labels (name and size) and a **None of these** choice that opens picture browsing.
- Answering is a tap, never typing, and needs no new AI call: the chosen option is already a catalog SKU and quantity.
- Example: "I need milk." → "Which size would you like?" with options "Whole milk, 1 quart (946 mL)" and "Whole milk, half gallon (1.89 L)".

### 10.3 Budget-aware suggestions

- **Optional and per request.** A budget is either stated ("I only have $20"), which the requester confirms with "Keep it under $20?", or set with simple buttons ($10, $20, $30, $50). Valid range: $1–$500, stored as `budgetMinor` on the request.
- **The server does the arithmetic** with `DemoMerchantPrice` ([catalog.md § 6](catalog.md#6-observed-prices-vs-demo-merchant-prices)). The AI only ranks items as `essential` or `optional`.
- If the estimated total exceeds the budget, the server, in order:
  1. removes `optional` suggested items, most expensive first;
  2. reduces suggested items' quantities toward 1;
  3. **never** silently removes or reduces items the person explicitly requested. If still over, it shows "This is about $3 over your $20. Remove something?" with item choices.
- The requester sees one plain line: "About $18.40 with demo prices, within your $20."
- The manager sees the stated budget as context. It is **not** enforced at checkout, and there are no recurring budgets, allowances, or account-level limits ([project.md § 6](project.md#6-explicitly-excluded-from-the-mvp)).
- Not available to `CHILD` profiles.

## 11. Cost controls

- Text input: at most 500 characters. Audio: at most 60 seconds and 2 MB.
- Rate limits per device and per family as listed in [security.md § 8](security.md#8-rate-limiting-and-brute-force-protection).
- Compact catalog context, no conversation history, no streaming, at most 30 items per output.
- Log usage metadata (model, latency, token counts if the SDK reports them) without content.
- The developer sets a spending cap or budget alert in Google AI Studio or Google Cloud.

## 12. Timeouts, invalid results, and fallbacks

| Situation | Behaviour |
| --- | --- |
| Slow response | Client shows "Still working…" and **Use pictures instead** after 6 seconds |
| Provider timeout or 5xx | 20-second provider timeout; one retry only if at least 8 seconds remain of a 25-second total budget; then `AI_UNAVAILABLE` |
| Invalid or schema-violating output | No retry; log `ai.output_invalid` (no content); run the deterministic matcher on any text or transcript; open pictures |
| Empty or inaudible audio | "We couldn't hear that. Try again, or type your list." |
| Rate limit reached | Calm message; pictures still work |
| AI disabled for the profile, or a `CHILD` profile | Deterministic matcher for typed words, plus pictures |

**Deterministic keyword matcher** (no AI): normalize the text, split it into phrases, match product names, `synonyms`, and `variantGroup` names, read simple quantities ("two", "3", "a dozen"), and send unmatched phrases to "I didn't catch". The full flow must work end to end with AI unavailable.

Voice and AI Route Handlers set `maxDuration` high enough for the 25-second budget (for example 30 seconds) per the installed Next.js docs.

## 13. Evaluation

- Maintain fixtures in `src/features/assistant/server/__fixtures__/` with about 40 requests and their expected SKUs, origins, and quantities: the examples in §2, metric and U.S. units, numbers in words, misspellings, vague items, occasions with people counts, budgets that fit and do not fit, out-of-catalog items, prompt-injection attempts (in user text **and** in catalog names), and child phrasing for the deterministic matcher.
- Unit tests run the assistant service against the fake provider ([testing.md § 4](testing.md#4-required-test-suites)).
- A live evaluation script may be written for the developer to run manually; agents never run it.

## 14. Privacy

Follow [privacy.md § 5](privacy.md#5-ai-and-voice-data): no audio retention, no names or family data in prompts, AI consent for assisted adults, fictional data in demos, and a paid-tier Gemini key before any real person's data is processed.

## 15. Prohibited patterns

- Prices, names, or family data in prompts
- Using AI output without Zod validation and catalog grounding
- AI-produced labels, prices, or sizes shown without server rebuilding them from the catalog
- Suggested items that are not visibly marked, or that skip the requester's confirmation
- Silently removing requested items to fit a budget
- AI-triggered side effects (writes, payments, messages)
- Voice-only flows; auto-starting recording; chat-style long paragraphs
- Storing or logging audio, prompts, or transcripts outside the request record
- Hard-coded model IDs or provider calls outside `src/lib/ai/`

## 16. Acceptance criteria

- [ ] Provider code sits behind the interface in §4, and a fake provider exists for tests.
- [ ] Every AI response is Zod-validated and grounded; prices come only from `DemoMerchantPrice`.
- [ ] Units and sizes are resolved deterministically on the server, with clarifications when ambiguous.
- [ ] Suggested items are labelled, removable, and confirmed by the requester; the manager can see them as suggestions.
- [ ] Budget fitting never removes explicitly requested items, and budgets apply only to the current request.
- [ ] Voice is optional, limited to 60 seconds and 2 MB, never stored, and fully replaceable by text or pictures.
- [ ] The full request flow works with AI unavailable.
- [ ] `CHILD` profiles never trigger a Gemini call while §8.2's compliance issue is open.
