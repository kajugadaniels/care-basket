// User-facing text for the family manager sign-in and sign-up pages (accessibility.md § 9).

export const authShellCopy = {
  backToHome: "Back to home",
  loading: "Loading the secure form…",
  failedTitle: "We couldn't load this form.",
  failedText: "Check your internet connection, then refresh this page to try again.",
} as const;

export const signInCopy = {
  metaTitle: "Sign in",
  title: "Welcome back",
  description: "Sign in to look after your family's shopping requests.",
  switchPrompt: "New to CareBasket?",
  switchLabel: "Create an account",
} as const;

export const signUpCopy = {
  metaTitle: "Create an account",
  title: "Create your family manager account",
  description:
    "For adults who look after shopping for a parent, grandparent, or child. The people you shop for won't need their own account.",
  note: "Family manager accounts are for adults.",
  switchPrompt: "Already have an account?",
  switchLabel: "Sign in",
} as const;
