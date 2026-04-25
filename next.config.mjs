/** @type {import("next").NextConfig} */
const nextConfig = {
  serverExternalPackages: ["node-pptx-parser", "unzipper"],
  turbopack: {}
};

export default nextConfig;
