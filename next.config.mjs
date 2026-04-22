import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for OpenNext (`npm run build` runs `next build` then bundles with --skipNextBuild).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

// Only for `next dev` — do not run during `next build` / OpenNext (workerd has stricter OS requirements).
if (process.argv.includes("dev")) {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
