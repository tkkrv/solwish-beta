import type { Config } from 'tailwindcss';

/** Дизайн-токены SolWish beta: светлая, спокойная палитра в духе TipLink + акценты Solana. */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F6FB',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#0B1220',
          2: '#4B5567',
          3: '#8A93A3',
        },
        line: {
          DEFAULT: '#E3E8F0',
          strong: '#CDD5E1',
        },
        brand: {
          DEFAULT: '#7C3AED',
          strong: '#6D28D9',
          soft: '#F3EEFF',
          ring: '#C4B5FD',
        },
        mint: {
          DEFAULT: '#0FA37F',
          soft: '#E7F8F2',
        },
        danger: {
          DEFAULT: '#DC2626',
          soft: '#FDECEC',
        },
        warn: {
          DEFAULT: '#B45309',
          soft: '#FFF6E5',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -12px rgba(11,18,32,0.12)',
        pop: '0 12px 40px -12px rgba(76,29,149,0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'sol-gradient': 'linear-gradient(120deg, #9945FF 0%, #7C3AED 45%, #14F195 100%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        aurora: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
        aurora: 'aurora 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
