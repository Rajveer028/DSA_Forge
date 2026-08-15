import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server 403s any fetch/HMR request whose Origin header isn't on
  // this allowlist. Chrome sends an Origin header on every chunk fetch, and
  // by default only http://localhost:3000 is allowed — visiting the app via
  // 127.0.0.1 makes every dynamically-imported chunk (Monaco's editor bundle
  // and its worker scripts included) fail to load, silently breaking paste
  // and multi-character edits while leaving basic typing working.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
