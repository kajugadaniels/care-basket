import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/features/auth/components/AuthShell/AuthShell";
import { signInCopy } from "@/features/auth/copy";

export const metadata: Metadata = {
  title: signInCopy.metaTitle,
};

// Clerk's prebuilt form offers only the sign-in methods enabled in the Clerk Dashboard.
export default function SignInPage() {
  return (
    <AuthShell
      title={signInCopy.title}
      description={signInCopy.description}
      switchPrompt={signInCopy.switchPrompt}
      switchLabel={signInCopy.switchLabel}
      switchHref="/sign-up"
    >
      <SignIn />
    </AuthShell>
  );
}
