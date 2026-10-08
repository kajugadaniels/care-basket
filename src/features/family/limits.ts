// Field limits shared by validation and form inputs. Must match the column limits in
// prisma/schema.prisma. Kept separate from schemas.ts so client code does not bundle Zod.
export const FAMILY_NAME_MIN_LENGTH = 2;
export const FAMILY_NAME_MAX_LENGTH = 60;
export const DISPLAY_NAME_MAX_LENGTH = 40;
