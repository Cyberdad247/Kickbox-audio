/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sovereign Aura tokens (blueprint.md §2)
        obsidian: '#050507',
        smoke: { 900: '#0D0D11', 800: '#16161E' },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#e9c349',
          royal: '#FFD700', // Polished Royal Gold — victory numerals
        },
        violet: { DEFAULT: '#9D4EDD', light: '#e0b6ff' },
      },
      fontFamily: {
        // Bound to next/font CSS variables (see app/layout.tsx)
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-serif)', '"Libre Caslon Text"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        minted: '-0.02em', // editorial negative tracking on financial values
      },
      boxShadow: {
        glow: '0 0 12px rgba(157, 78, 221, 0.45)',
        'glow-lg': '0 0 24px rgba(157, 78, 221, 0.6)',
        gold: '0 0 16px rgba(212, 175, 55, 0.25)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(157, 78, 221, 0.55)' },
          '50%': { boxShadow: '0 0 0 8px rgba(157, 78, 221, 0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
