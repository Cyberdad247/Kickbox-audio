import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#050505',
          900: '#0D0D11',
        },
        plate: {
          900: '#16161E',
        },
        filigree: {
          400: '#FFD700',
          500: '#D4AF37',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#FFD700',
          royal: '#FFD700',
        },
        violet: {
          DEFAULT: '#9D4EDD',
          light: '#e0b6ff',
        },
        kinetic: {
          500: '#9D4EDD',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Source Serif 4', 'Georgia', 'serif'],
      },
      boxShadow: {
        kinetic: '0 0 12px rgba(157, 78, 221, 0.9)',
        filigree: 'inset 0 0 0 1px rgba(212, 175, 55, 0.9)',
        gold: '0 0 16px rgba(212, 175, 55, 0.25)',
        glow: '0 0 12px rgba(157, 78, 221, 0.45)',
      },
      backdropBlur: {
        plate: '12px',
      },
      borderRadius: {
        none: '0px',
      },
      letterSpacing: {
        executive: '0.1em',
        display: '0',
      },
    },
  },
  plugins: [],
};

export default config;
