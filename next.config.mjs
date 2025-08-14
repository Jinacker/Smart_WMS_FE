/** @type {import('next').NextConfig} */

// 백엔드 주소를 환경변수로도 바꿀 수 있게 처리 (없으면 prod 기본값)
const BACKEND_URL = process.env.BACKEND_URL || 'https://smart-wms-be.p-e.kr';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
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
      // 프로덕션 BE 이미지
      {
        protocol: 'https',
        hostname: 'smart-wms-be.p-e.kr',
      },
      // 로컬 개발 시 이미지 (원하면 주석 해제)
      // { protocol: 'http', hostname: 'localhost', port: '8080' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400,
  },
  async rewrites() {
    return [
      // 모든 프론트 호출은 /api/** 로 때리고 → BE /api/** 로 프록시
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // CSRF 엔드포인트 (둘 다 지원)
      {
        source: '/csrf',
        destination: `${BACKEND_URL}/csrf`,
      },
      {
        source: '/api/csrf',
        destination: `${BACKEND_URL}/csrf`,
      },
    ];
  },
};

export default nextConfig;
