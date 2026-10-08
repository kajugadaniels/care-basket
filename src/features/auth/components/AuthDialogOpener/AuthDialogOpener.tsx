"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import {
  AUTH_DIALOG_PARAM,
  parseAuthDialog,
  signInDialogOptions,
  signUpDialogOptions,
} from "@/lib/clerk/auth-dialogs";

// Opens the sign-in or sign-up dialog when someone arrives at /?auth=sign-in or /?auth=sign-up,
// for example after Clerk redirects a signed-out visitor away from /family. Renders nothing.
export function AuthDialogOpener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const hasHandledRequest = useRef(false);
  const requestedDialog = parseAuthDialog(searchParams.get(AUTH_DIALOG_PARAM));

  useEffect(() => {
    if (!requestedDialog || !isLoaded || hasHandledRequest.current) {
      return;
    }
    hasHandledRequest.current = true;

    if (isSignedIn) {
      router.replace("/family");
      return;
    }

    // Drop the query so a refresh does not reopen the dialog; the dialog stays open.
    router.replace("/", { scroll: false });
    if (requestedDialog === "sign-up") {
      clerk.openSignUp(signUpDialogOptions);
    } else {
      clerk.openSignIn(signInDialogOptions);
    }
  }, [requestedDialog, isLoaded, isSignedIn, clerk, router]);

  return null;
}
