import type { NextConfig } from "next";

// Validate required environment variables at build time
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      `Please set it in your Vercel project settings or .env.local file.\n` +
      `Current env: ${JSON.stringify(Object.keys(process.env).filter(k => k.includes('SUPABASE')))}`
    );
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude scripts directory from build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'scripts': 'commonjs scripts'
      });
    }
    return config;
  }
};

export default nextConfig;
