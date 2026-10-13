import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Шрифты и обложки читаются с диска при генерации OG-картинок — включаем их в серверный бандл.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/fonts/**'],
    '/w/[id]/opengraph-image': ['./assets/fonts/**', './public/covers/**'],
    '/card/[signature]/story': ['./assets/fonts/**'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
