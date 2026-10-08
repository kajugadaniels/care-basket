import { z } from "zod";
import {
  DISPLAY_NAME_MAX_LENGTH,
  FAMILY_NAME_MAX_LENGTH,
  FAMILY_NAME_MIN_LENGTH,
} from "@/features/family/limits";

// Invisible characters that can disguise text: zero-width space, left-to-right and
// right-to-left marks, bidi embeddings and overrides, word joiner, bidi isolates, and BOM.
// Zero-width joiner and non-joiner stay allowed because some scripts and emoji need them.
const INVISIBLE_FORMAT_CODE_POINTS = new Set([
  0x200b, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0x2066, 0x2067,
  0x2068, 0x2069, 0xfeff,
]);

// Rejects control characters (C0, DEL, C1), line and paragraph separators, and the set above.
export function hasUnsafeCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029 ||
      INVISIBLE_FORMAT_CODE_POINTS.has(codePoint)
    ) {
      return true;
    }
  }
  return false;
}

const UNSAFE_CHARACTERS_MESSAGE = "Remove hidden or special characters.";

// Each empty-field check aborts, so a blank field reports one friendly message, not several.
const familyNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter a name for your family.", abort: true })
  .min(FAMILY_NAME_MIN_LENGTH, `Use at least ${FAMILY_NAME_MIN_LENGTH} characters.`)
  .max(FAMILY_NAME_MAX_LENGTH, `Use ${FAMILY_NAME_MAX_LENGTH} characters or fewer.`)
  .refine((value) => !hasUnsafeCharacters(value), UNSAFE_CHARACTERS_MESSAGE);

const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter the name your family calls you.", abort: true })
  .max(DISPLAY_NAME_MAX_LENGTH, `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`)
  .refine((value) => !hasUnsafeCharacters(value), UNSAFE_CHARACTERS_MESSAGE);

// Strict: extra fields such as userId, familyId, or role are rejected, never trusted.
export const createFamilySchema = z.strictObject({
  familyName: familyNameSchema,
  displayName: displayNameSchema,
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
