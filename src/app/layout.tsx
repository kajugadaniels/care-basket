import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";
import "./globals.css";

// Primary interface typeface. A licensed alternative, not PayPal's proprietary font.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Reading typeface for requester-facing text; downloaded only where it is used.
const atkinsonHyperlegibleNext = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "CareBasket",
    template: "%s · CareBasket",
  },
  description:
    "Ask for groceries by speaking, typing, or choosing pictures. A trusted family member reviews the basket and decides whether to pay.",
  applicationName: "CareBasket",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-US"
      className={`${dmSans.variable} ${atkinsonHyperlegibleNext.variable}`}
    >
      <body>
        {/* Not `dynamic`: the provider reads no request data, so pages keep their static shell.
            Components that read the session sit behind their own Suspense boundaries. */}
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
