import type { NextConfig } from "next";
import { cloudinaryRemotePatterns } from "./src/lib/cloudinary/catalog-images";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
	images: {
		remotePatterns: cloudinaryRemotePatterns(process.env.CLOUDINARY_CLOUD_NAME),
		maximumRedirects: 0,
		maximumResponseBody: 2 * 1024 * 1024,
	},
  env: {
    // Clerk's development-key notice is expected locally. Silence it only for
    // `next dev`; production builds retain the warning as a deployment guard.
    NEXT_PUBLIC_CLERK_UNSAFE_DISABLE_DEVELOPMENT_MODE_CONSOLE_WARNING:
      process.env.NODE_ENV === "development" ? "true" : "false",
  },
};

export default nextConfig;
