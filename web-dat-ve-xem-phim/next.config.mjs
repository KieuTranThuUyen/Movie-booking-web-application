/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",

              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

              "style-src 'self' 'unsafe-inline'",

              "img-src 'self' data: https: blob:",

              "font-src 'self' data:",

              "connect-src 'self' https: https://pay-sandbox.sepay.vn https://pay.sepay.vn",

              // Cho phép iframe YouTube
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",

              // Không cho website khác nhúng website của bạn
              "frame-ancestors 'none'",

              "base-uri 'self'",

              // Cho phép submit form sang SePay
              "form-action 'self' https://pay-sandbox.sepay.vn https://pay.sepay.vn",
            ].join('; '),
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value:
                    'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },

      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;