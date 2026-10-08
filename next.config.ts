import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  env: {
    // Clerk's development-key notice is expected locally. Silence it only for
    // `next dev`; production builds retain the warning as a deployment guard.
    NEXT_PUBLIC_CLERK_UNSAFE_DISABLE_DEVELOPMENT_MODE_CONSOLE_WARNING:
      process.env.NODE_ENV === "development" ? "true" : "false",
  },
};

export default nextConfig;
