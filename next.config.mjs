/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep heavy native/Node-only packages out of the webpack bundle
  experimental: {
    serverComponentsExternalPackages: ["node-pptx-parser", "unzipper"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark the optional AWS SDK peer dep of unzipper as external
      // so webpack doesn't try to bundle it (it's never actually used)
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@aws-sdk/client-s3",
      ];
    }
    return config;
  },
};

export default nextConfig;
