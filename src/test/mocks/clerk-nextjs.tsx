import type { ReactNode } from "react";

// Test double for @clerk/nextjs: no network calls and no Clerk keys.
// Use with: vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
type ClerkStatus = "loading" | "ready" | "failed";

const state: { signedIn: boolean; status: ClerkStatus } = { signedIn: false, status: "ready" };

export function resetClerkMock() {
  state.signedIn = false;
  state.status = "ready";
}

export function setSignedIn(signedIn: boolean) {
  state.signedIn = signedIn;
}

export function setClerkStatus(status: ClerkStatus) {
  state.status = status;
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

export function ClerkLoading({ children }: { children?: ReactNode }) {
  return <>{state.status === "loading" ? children : null}</>;
}

export function ClerkFailed({ children }: { children?: ReactNode }) {
  return <>{state.status === "failed" ? children : null}</>;
}

export function SignIn() {
  return <div data-testid="clerk-sign-in" />;
}

export function SignUp() {
  return <div data-testid="clerk-sign-up" />;
}
