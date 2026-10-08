import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkSpies, resetClerkMock, setClerkLoaded, setSignedIn } from "@/test/mocks/clerk-nextjs";
import { AuthDialogOpener } from "./AuthDialogOpener";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), search: "" }));

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe("AuthDialogOpener", () => {
  beforeEach(() => {
    resetClerkMock();
    navigation.replace.mockReset();
    navigation.search = "";
  });

  it("opens the sign-in dialog, with sign-up available inside it", () => {
    navigation.search = "auth=sign-in";
    render(<AuthDialogOpener />);

    expect(clerkSpies.openSignIn).toHaveBeenCalledOnce();
    expect(clerkSpies.openSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ withSignUp: true, fallbackRedirectUrl: "/family" }),
    );
    expect(clerkSpies.openSignUp).not.toHaveBeenCalled();
  });

  it("opens the sign-up dialog", () => {
    navigation.search = "auth=sign-up";
    render(<AuthDialogOpener />);

    expect(clerkSpies.openSignUp).toHaveBeenCalledOnce();
    expect(clerkSpies.openSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackRedirectUrl: "/family" }),
    );
  });

  it("removes the query so a refresh does not reopen the dialog", () => {
    navigation.search = "auth=sign-in";
    render(<AuthDialogOpener />);

    expect(navigation.replace).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("sends adults who are already signed in to their family workspace", () => {
    navigation.search = "auth=sign-in";
    setSignedIn(true);
    render(<AuthDialogOpener />);

    expect(navigation.replace).toHaveBeenCalledWith("/family");
    expect(clerkSpies.openSignIn).not.toHaveBeenCalled();
  });

  it("waits until Clerk has loaded", () => {
    navigation.search = "auth=sign-in";
    setClerkLoaded(false);
    render(<AuthDialogOpener />);

    expect(clerkSpies.openSignIn).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each(["", "auth=admin", "auth=https://example.com"])(
    "does nothing for the query %j",
    (search) => {
      navigation.search = search;
      render(<AuthDialogOpener />);

      expect(clerkSpies.openSignIn).not.toHaveBeenCalled();
      expect(clerkSpies.openSignUp).not.toHaveBeenCalled();
      expect(navigation.replace).not.toHaveBeenCalled();
    },
  );
});
