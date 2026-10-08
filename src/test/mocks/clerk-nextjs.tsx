import type { ReactNode } from "react";
import { vi } from "vitest";

// Test double for @clerk/nextjs: no network calls and no Clerk keys.
// Use with: vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
const state = { signedIn: false, loaded: true };

export const clerkSpies = {
  openSignIn: vi.fn(),
  openSignUp: vi.fn(),
};

export function resetClerkMock() {
  state.signedIn = false;
  state.loaded = true;
  clerkSpies.openSignIn.mockReset();
  clerkSpies.openSignUp.mockReset();
}

export function setSignedIn(signedIn: boolean) {
  state.signedIn = signedIn;
}

export function setClerkLoaded(loaded: boolean) {
  state.loaded = loaded;
}

type ShowProps = {
  when: "signed-in" | "signed-out";
  fallback?: ReactNode;
  children?: ReactNode;
};

export function Show({ when, fallback = null, children }: ShowProps) {
  const visible = when === "signed-in" ? state.signedIn : !state.signedIn;
  return <>{visible ? children : fallback}</>;
}

export function UserButton() {
  return <button type="button">Open account menu</button>;
}

// The real buttons attach a click handler to their child that opens Clerk's dialog.
type DialogButtonProps = { mode?: "modal" | "redirect"; children?: ReactNode };

export function SignInButton({ mode = "redirect", children }: DialogButtonProps) {
  return (
    <span data-clerk-dialog="sign-in" data-mode={mode}>
      {children}
    </span>
  );
}

export function SignUpButton({ mode = "redirect", children }: DialogButtonProps) {
  return (
    <span data-clerk-dialog="sign-up" data-mode={mode}>
      {children}
    </span>
  );
}

export function useAuth() {
  return { isLoaded: state.loaded, isSignedIn: state.loaded ? state.signedIn : undefined };
}

export function useClerk() {
  return clerkSpies;
}
