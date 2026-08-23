/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Arthurian Cyber Core Palette
        void: {
          DEFAULT: '#0A0A0A',
          950: '#050505',
          900: '#0A0A0A',
          850: '#0D0D11',
          800: '#111116',
        },
        obsidian: '#0A0A0A',
        cyan: {
          DEFAULT: '#00F0FF',
          neon: '#00F0FF',
          glow: '#00E5FF',
          dim: '#00A3B0',
        },
        magenta: {
          DEFAULT: '#FF00FF',
          neon: '#FF00FF',
          glow: '#E000E0',
          dim: '#990099',
        },
        gold: {
          DEFAULT: '#FFD700',
          royal: '#FFD700',
          light: '#FFE44D',
          antique: '#D4AF37',
          dark: '#B8860B',
        },
        arthurian: {
          void: '#0A0A0A',
          cyan: '#00F0FF',
          magenta: '#FF00FF',
          gold: '#FFD700',
          steel: '#2A2A38',
          silver: '#E2E8F0',
        },
        smoke: {
          800: '#151515',
          900: '#111111',
        },
        plate: {
          950: '#08080E',
          900: '#0E0E17',
          800: '#161622',
          700: '#242436',
          400: '#7A7A8C',
        },
        filigree: {
          400: '#FFD700',
          500: '#D4AF37',
        },
        kinetic: {
          500: '#9D4EDD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        68: '17rem',
        76: '19rem',
        84: '21rem',
        88: '22rem',
        100: '25rem',
        112: '28rem',
        128: '32rem',
        'sidebar-compact': '80px',
        'sidebar-expanded': '220px',
        'feed-width': '320px',
        'intent-bar': '160px',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4), 0 0 30px rgba(0, 240, 255, 0.2)',
        'neon-magenta': '0 0 15px rgba(255, 0, 255, 0.4), 0 0 30px rgba(255, 0, 255, 0.2)',
        'neon-gold': '0 0 15px rgba(255, 215, 0, 0.4), 0 0 30px rgba(255, 215, 0, 0.2)',
        'glass-edge': 'inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.8)',
        'glass-cyan': 'inset 0 0 0 1px rgba(0, 240, 255, 0.2), 0 8px 32px rgba(0, 240, 255, 0.08)',
        'glass-gold': 'inset 0 0 0 1px rgba(255, 215, 0, 0.2), 0 8px 32px rgba(255, 215, 0, 0.08)',
        kinetic: '0 0 12px rgba(157, 78, 221, 0.9)',
        filigree: 'inset 0 0 0 1px rgba(212, 175, 55, 0.9)',
        glow: '0 0 12px rgba(0, 240, 255, 0.45)',
      },
      backdropBlur: {
        xs: '2px',
        plate: '12px',
        glass: '20px',
        heavy: '32px',
      },
      letterSpacing: {
        executive: '0.1em',
        rune: '0.15em',
        display: '0.05em',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(0, 240, 255, 0.5)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'viseme-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar-sweep 8s linear infinite',
        'viseme-pulse': 'viseme-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
