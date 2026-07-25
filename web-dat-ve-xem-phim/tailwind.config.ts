import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(2,8,23,0.45)'
      }
    }
  },
  plugins: []
};

export default config;