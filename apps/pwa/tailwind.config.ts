import type { Config } from 'tailwindcss';

const config: Config = {
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
        '18': '4.5rem',
        '22': '5.5rem',
        '68': '17rem',
        '76': '19rem',
        '84': '21rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
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
        'snap-in': {
          '0%': { transform: 'translateY(-50%) translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(-50%) translateX(0)', opacity: '1' },
        },
        'ooda-aura': {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(255, 215, 0, 0.2), inset 0 0 6px rgba(255, 215, 0, 0.08)',
            borderColor: 'rgba(255, 215, 0, 0.45)',
          },
          '50%': {
            boxShadow:
              '0 0 22px rgba(255, 215, 0, 0.65), 0 0 36px rgba(212, 175, 55, 0.35), inset 0 0 14px rgba(255, 215, 0, 0.2)',
            borderColor: 'rgba(255, 228, 77, 0.95)',
          },
        },
        'ooda-pill': {
          '0%, 100%': {
            boxShadow: '0 0 6px rgba(255, 215, 0, 0.3)',
            filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))',
          },
          '50%': {
            boxShadow: '0 0 16px rgba(255, 215, 0, 0.75), 0 0 28px rgba(212, 175, 55, 0.45)',
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.65))',
          },
        },
        'glow-pass': {
          '0%': { left: '-40%', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        'connector-pulse': {
          '0%, 100%': {
            opacity: '0.25',
            filter: 'drop-shadow(0 0 2px rgba(255, 215, 0, 0.2))',
          },
          '50%': {
            opacity: '1',
            filter:
              'drop-shadow(0 0 8px rgba(255, 215, 0, 0.85)) drop-shadow(0 0 16px rgba(212, 175, 55, 0.55))',
          },
        },
        'cinematic-enter': {
          '0%': { opacity: '0', filter: 'blur(12px)', transform: 'scale(1.03)' },
          '100%': { opacity: '1', filter: 'blur(0px)', transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar-sweep 8s linear infinite',
        'viseme-pulse': 'viseme-pulse 1.5s ease-in-out infinite',
        'snap-in': 'snap-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ooda-aura': 'ooda-aura 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'ooda-pill': 'ooda-pill 1.8s ease-in-out infinite',
        'glow-pass': 'glow-pass 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'connector-pulse': 'connector-pulse 1.6s ease-in-out infinite',
        'cinematic-enter': 'cinematic-enter 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
