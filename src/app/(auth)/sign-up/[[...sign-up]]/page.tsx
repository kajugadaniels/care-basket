import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/features/auth/components/AuthShell/AuthShell";
import { signUpCopy } from "@/features/auth/copy";

export const metadata: Metadata = {
  title: signUpCopy.metaTitle,
};

// Adults only. Managed profiles for parents, grandparents, and children never register here.
export default function SignUpPage() {
  return (
    <AuthShell
      title={signUpCopy.title}
      description={signUpCopy.description}
      note={signUpCopy.note}
      switchPrompt={signUpCopy.switchPrompt}
      switchLabel={signUpCopy.switchLabel}
      switchHref="/sign-in"
    >
      <SignUp />
    </AuthShell>
  );
}
