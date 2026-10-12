import type { NextConfig } from "next";
import { cloudinaryRemotePatterns } from "./src/lib/cloudinary/catalog-images";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
	poweredByHeader: false,
	headers() {
		// Defer CSP until Clerk/PayPal resource and nonce policies are browser-verified.
		return [{ source: "/:path*", headers: [
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{ key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
			{ key: "X-Frame-Options", value: "DENY" },
		] }];
	},
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
