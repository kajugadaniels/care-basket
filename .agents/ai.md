# AI-Assisted Shopping and Voice

**Purpose:** Define what CareBasket's AI does and must never do, how the provider is abstracted, how outputs are validated against the catalog, and how voice input works safely and accessibly.
**Applies to:** Anything touching AI, transcription, catalog matching, or voice capture.
**Related:** [privacy.md](privacy.md), [security.md](security.md), [accessibility.md § 7](accessibility.md#7-voice-audio-and-feedback), [api.md § 3](api.md#3-route-handlers), [testing.md](testing.md)
**Last reviewed:** 2026-10-08

---

## 1. Role of AI

AI turns what a person says or types into a **proposal**: a list of catalog items with quantities. People confirm the proposal; the server prices it; a family manager decides whether to pay. AI is an interpreter, not a decision-maker.

## 2. AI responsibilities

- Interpret natural-language grocery requests ("milk, two loaves of bread and some apples").
- Transcribe short voice recordings.
- Extract items and quantities.
- Match items to the existing catalog by SKU.
- Ask one simple clarification question when confidence is insufficient.
- Propose clearly labelled substitutions from the same category, with a short reason.
- Produce structured output that the server validates.
- Provide short, understandable feedback text for clarifications.

## 3. AI must not

- Invent products, prices, availability, discounts, or delivery times. The AI never receives prices.
- Charge anyone, authorize or capture payments, or change amounts. Any basket change after manager review needs renewed manager review ([payments.md § 3](payments.md#3-payment-workflow)).
- See or reveal private family data: names, other profiles, other requests, payment data, or device data.
- Hold open-ended conversations, give advice (medical, dietary, financial), or answer questions unrelated to the shopping list.
- Make guarantees ("this will arrive today").
- Silently replace an item with an unrelated product.
- Call tools or functions that have side effects.

## 4. Provider abstraction

Integration code lives in `src/lib/ai/` (server-only). Feature logic (catalog join, confidence rules, limits) lives in `src/features/assistant/server/`.

```ts
// src/lib/ai/provider.ts
export interface ShoppingAssistantProvider {
  interpretText(input: InterpretTextInput): Promise<RawProposal>;
  interpretAudio(input: InterpretAudioInput): Promise<RawProposal & { transcript: string }>;
}

type CatalogEntryForAi = { sku: string; name: string; unitLabel: string; category: string; synonyms: string[] };
type InterpretTextInput = { text: string; catalog: CatalogEntryForAi[]; locale: string; audience: 'adult' | 'child' };
type InterpretAudioInput = Omit<InterpretTextInput, 'text'> & { audio: Uint8Array; mimeType: SupportedAudioMimeType };
```

- `src/lib/ai/gemini/` implements the interface with `@google/genai` (`GoogleGenAI`). A fake implementation for tests lives next to the tests.
- Select the provider in one factory (`getShoppingAssistant()`). Swapping providers must not change feature code.
- The model ID comes from `GEMINI_MODEL` (validated env). Choose a fast, cost-efficient current model that supports audio input and JSON-schema output. Do not hard-code model names elsewhere.
- **The Gemini API evolves quickly** (for example, the Interactions API and its 2026 configuration changes). Before writing or changing provider code, read the current official Gemini documentation for the installed `@google/genai` version (the Gemini docs MCP server or ai.google.dev). Use the SDK's current structured-output configuration; never copy older examples.
- Use low temperature, a request timeout (20 seconds via `AbortSignal`), and no streaming.

## 5. Structured output and catalog matching

The model returns JSON constrained by a JSON Schema generated from the Zod schema (`z.toJSONSchema`). The response is then **always re-validated with Zod**, whatever the provider promises.

```ts
const proposalSchema = z.strictObject({
  items: z.array(z.strictObject({
    sku: z.string().max(40).nullable(),        // must be a SKU from the supplied catalog
    requestedText: z.string().max(80),         // what the person asked for, in their words
    quantity: z.int().min(1).max(20),
    confidence: z.enum(['high', 'medium', 'low']),
    substitution: z.strictObject({ reason: z.string().max(120) }).nullable(),
  })).max(30),
  clarification: z.strictObject({
    question: z.string().max(120),
    optionSkus: z.array(z.string().max(40)).max(4),
  }).nullable(),
  unrecognized: z.array(z.string().max(80)).max(10),
});
```

Server processing after validation (in the assistant service):

1. Drop any SKU not in the catalog that was sent; move its `requestedText` to `unrecognized`.
2. Join SKUs with `Product` from the database for names, images, and (for managers only) prices. Prices never come from the AI.
3. Merge duplicate SKUs by summing quantities, capped at 20.
4. Apply the confidence rules in §6.
5. Return a requester-facing DTO: picture cards, quantities, substitution notes, one clarification, and unrecognized phrases.

Catalog context sent to the model: only available products, as `sku`, `name`, `unitLabel`, `category`, and `synonyms`. If the catalog grows beyond about 200 products, pre-filter by keyword and category on the server before calling the model.

## 6. Confidence and clarification

| Confidence | Behaviour |
| --- | --- |
| `high` | Added to the proposal. |
| `medium` | Added, with a visible "Is this right?" marker the requester can tap to change. |
| `low` | Not added. Becomes the clarification (if options exist) or appears under "I didn't catch". |

- At most **one** clarification at a time, at most 120 characters, answered by **tapping** one of up to four catalog picture cards, never by typing.
- Unrecognized phrases are shown back ("I didn't catch: 'the usual'") with buttons to browse pictures or try again.
- Substitutions are always visible to the requester ("We don't have oat milk. Is soy milk okay?") and flagged to the manager as substitutions. They come only from the same category.

## 7. Voice input

Voice is optional. Text and picture selection are always available ([accessibility.md § 7](accessibility.md#7-voice-audio-and-feedback)).

Client (a small Client Component in `features/assistant/components/`):

- Request microphone permission only when the user taps the microphone button. If permission is denied, the API is unsupported, or the context is not secure, hide the microphone and show text and pictures with a short, friendly explanation.
- Record with `MediaRecorder`, choosing the first supported type from `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg;codecs=opus` via `MediaRecorder.isTypeSupported`.
- Maximum **60 seconds**: show a timer, warn in the last 10 seconds, stop automatically, and keep what was recorded.
- Show clear listening, processing, and done states, announced through a live region.
- Upload to `POST /api/assistant/voice` as `multipart/form-data`.

Server (Route Handler → assistant service):

- Require a device session for a non-`CHILD` profile (§8), check the `Origin` header, and apply rate limits ([security.md § 8](security.md#8-rate-limiting-and-brute-force-protection)).
- Reject bodies over **2 MB** (413) and MIME types outside the allow-list (415): `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/m4a`, `audio/aac`, `audio/mpeg`, `audio/wav`. Map each to a type that the current Gemini docs list as supported (WebM, OGG, M4A, AAC, MP3, and WAV are listed today). Verify Safari's `audio/mp4` recordings end to end.
- Send audio inline (well under Gemini's inline request size limit). Interpretation and transcription happen in one structured call that returns `transcript` plus the proposal.
- **Never persist audio.** Do not write it to disk, the database, logs, or caches; drop references after the call.
- Return the transcript so the requester can see what was heard.

## 8. Profiles, children, and tone

- Send the model only `audience` and `locale`. Never send names, ages, family details, or history.
- **Children and Gemini (open compliance issue).** The Gemini API Additional Terms of Service (https://ai.google.dev/gemini-api/terms, checked 2026-10-08) state that the Services must not be used as part of an application "directed towards or … likely to be accessed by individuals under the age of 18." Until the developer resolves this:
  - `CHILD` profiles MUST NOT trigger any Gemini call (no voice, no AI text interpretation). Child devices use picture selection and the deterministic keyword match in §10.
  - The `child` audience value stays in the provider interface for a future compliant provider, but the Gemini adapter rejects it.
  - Whether the app as a whole may use Gemini while child profiles exist is a **developer decision** that may require removing child profiles from the public demo or choosing a different provider. Record the decision in this section.
- The demo catalog contains **no age-restricted, medical, or hazardous products** (no alcohol, tobacco, medicines, supplements, or knives), so no child can request them.
- Tone: warm, short, plain words, no emoji, no exclamation-heavy enthusiasm, no claims about delivery or price.

## 9. Prompt injection and output safety

- System instructions are fixed in code (`src/lib/ai/prompts.ts`) and never built from user input.
- User text and transcripts are wrapped in clearly delimited blocks and described to the model as untrusted data to interpret, not instructions to follow.
- The model has **no tools** and its only output is schema-constrained JSON. Unknown fields are rejected by `z.strictObject`.
- The output can only produce a proposal of existing catalog SKUs. It cannot change prices, trigger payments, read data, or reach other families. Even a successful injection can at most propose wrong catalog items, which the requester and the manager both see before any payment.
- AI-generated text is rendered as plain text, never as HTML or Markdown.
- Include injection attempts in the evaluation fixtures (§12).

## 10. Error recovery and fallbacks

| Failure | Behaviour |
| --- | --- |
| Timeout or provider 5xx | One retry with jitter for idempotent interpretation, then `AI_UNAVAILABLE` |
| Invalid or schema-violating output | No retry; `AI_UNAVAILABLE` and log `ai.output_invalid` (no content) |
| Empty or inaudible audio | "We couldn't hear that. Try again, or type your list." |
| Rate limit reached | Calm message; pictures still work |
| Any AI failure | Picture browsing remains fully functional; typed text is preserved |

The product must work end to end with **AI disabled**:

- Picture selection needs no AI.
- Typed text falls back to a **deterministic keyword match** in the assistant service: normalize the text, split it into phrases, and match product names and `synonyms` (with simple number words for quantities). Unmatched phrases go to "I didn't catch". This path is also the only text path for `CHILD` profiles (§8).

## 11. Cost controls

- Text input: maximum 500 characters. Audio: maximum 60 seconds and 2 MB.
- Rate limits per device and per family as listed in [security.md § 8](security.md#8-rate-limiting-and-brute-force-protection).
- Compact catalog context, no conversation history, no streaming.
- Log usage metadata (model, latency, token counts if the SDK reports them) without content, so the developer can watch costs.
- Configure a spending cap or budget alert in Google AI Studio or Google Cloud (a developer task).

## 12. Evaluation

- Maintain fixtures in `src/features/assistant/server/__fixtures__/` with about 30 representative requests and their expected SKUs and quantities: simple lists, numbers in words, misspellings, vague items ("something for breakfast"), out-of-catalog items, child phrasing, and prompt-injection attempts.
- Unit tests run the assistant service against the fake provider ([testing.md](testing.md)).
- A live evaluation script may be written for the developer to run manually; agents never run it.

## 13. Privacy

Follow [privacy.md § 5](privacy.md#5-ai-and-voice-data). In short: no audio retention, minimal context, no names, fictional data in demos, and a paid-tier Gemini key before any real user data is processed.

## 14. Prohibited patterns

- Prices, names, or family data in prompts
- Using AI output without Zod validation and catalog checks
- AI-triggered side effects (writes, payments, messages)
- Voice-only flows; auto-starting recording
- Storing or logging audio, prompts, or transcripts outside the request record
- Hard-coded model IDs or provider calls outside `src/lib/ai/`

## 15. Acceptance criteria

- [ ] Provider code sits behind the interface in §4, and a fake provider exists for tests.
- [ ] Every AI response is Zod-validated and catalog-checked before use; prices come only from the database.
- [ ] Low-confidence and unknown items are never silently added; substitutions are visible to both requester and manager.
- [ ] Voice is optional, limited to 60 seconds and 2 MB, never stored, and fully replaceable by text or pictures.
- [ ] The full request flow works with AI unavailable.
- [ ] `CHILD` profiles never trigger a Gemini call while §8's compliance issue is open.
