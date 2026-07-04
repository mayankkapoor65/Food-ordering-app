/** @type {import('next').NextConfig} */

// Security headers applied to every response.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false, // don't advertise the framework
  // Emit a small, self-contained build only for Docker (set DOCKER_BUILD=1).
  // Keeps `npm start` working normally for local/plain deployments.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
