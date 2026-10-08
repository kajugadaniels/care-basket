// Prisma reports unique-constraint violations with code P2002, including through driver adapters.
// Checking the code avoids depending on the generated client's error classes.
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
