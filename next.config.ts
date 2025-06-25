
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'export', // Removed: Not compatible with Server Actions used by Genkit
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // This is to solve a warning with handlebars and genkit:
    // "require.extensions is not supported by webpack. Use a loader instead."
    // By marking handlebars as external, we prevent webpack from trying to bundle it.
    config.externals.push('handlebars');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
