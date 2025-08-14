/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  onDemandEntries: { maxInactiveAge: 25 * 1000, pagesBufferLength: 2 },
  output: 'standalone',
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8080' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },
  // 로컬 개발시에만 /api -> localhost:8080 프록시
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://localhost:8080/api/:path*' },
      ];
    }
    // 프로덕션은 vercel.json이 처리하므로 여기선 빈 배열
    return [];
  },
};

export default nextConfig;
