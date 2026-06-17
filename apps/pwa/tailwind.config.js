/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sovereign Aura tokens (blueprint.md §2)
        obsidian: '#050507',
        smoke: { 900: '#0D0D11', 800: '#16161E' },
        gold: { DEFAULT: '#D4AF37', light: '#e9c349' },
        violet: { DEFAULT: '#9D4EDD', light: '#e0b6ff' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Source Serif 4"', '"Libre Caslon Text"', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 0 12px rgba(157, 78, 221, 0.45)',
      },
    },
  },
  plugins: [],
};
