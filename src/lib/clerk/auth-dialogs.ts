// Sign-in and sign-up open as Clerk dialogs, never as pages (authentication.md § 3).
// Adults land on the family workspace afterwards unless Clerk carries a valid redirect_url.
const FAMILY_HOME_PATH = "/family";

// withSignUp lets someone without an account create one inside the same dialog.
export const signInDialogOptions = {
  withSignUp: true,
  fallbackRedirectUrl: FAMILY_HOME_PATH,
  signUpFallbackRedirectUrl: FAMILY_HOME_PATH,
};

export const signUpDialogOptions = {
  fallbackRedirectUrl: FAMILY_HOME_PATH,
  signInFallbackRedirectUrl: FAMILY_HOME_PATH,
};

// Query values the home page accepts to open a dialog, for example /?auth=sign-in.
export const AUTH_DIALOG_PARAM = "auth";
export type AuthDialog = "sign-in" | "sign-up";

export function parseAuthDialog(value: string | null): AuthDialog | null {
  return value === "sign-in" || value === "sign-up" ? value : null;
}
