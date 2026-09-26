import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() { return [{source:"/(.*)",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"X-DNS-Prefetch-Control",value:"off"},
    {key:"Cross-Origin-Opener-Policy",value:"same-origin-allow-popups"},
    {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
    {key:"Strict-Transport-Security",value:"max-age=63072000; includeSubDomains"},
    {key:"Content-Security-Policy",value:"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https://challenges.cloudflare.com; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; upgrade-insecure-requests"}
  ]},{source:"/admin/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},{source:"/api/admin/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},{source:"/api/auth/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]},{source:"/api/maintenance/:path*",headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]}]; },
};

export default nextConfig;
