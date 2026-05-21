/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wire: {
          blue: '#3b82f6',
          yellow: '#facc15',
          red: '#ef4444',
        },
        bomb: {
          bg: '#0f172a',
          panel: '#1e293b',
          accent: '#f97316',
          coach: '#10b981',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'tile-cut': 'tile-cut 350ms ease-out forwards',
        'tile-reveal': 'tile-reveal 400ms ease-out',
        'shake': 'shake 400ms ease-in-out',
        'flash-red': 'flash-red 700ms ease-out forwards',
        'fade-in': 'fade-in 200ms ease-out',
      },
      keyframes: {
        'tile-cut': {
          '0%': { opacity: '1', transform: 'scale(1) rotate(0)', maxWidth: '5rem' },
          '60%': { opacity: '0.4', transform: 'scale(0.7) rotate(-15deg)' },
          '100%': { opacity: '0', transform: 'scale(0) rotate(-25deg)', maxWidth: '0', marginRight: '-0.5rem' },
        },
        'tile-reveal': {
          '0%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        'flash-red': {
          '0%': { opacity: '0', backgroundColor: 'rgba(239, 68, 68, 0)' },
          '20%': { opacity: '1', backgroundColor: 'rgba(239, 68, 68, 0.9)' },
          '100%': { opacity: '0', backgroundColor: 'rgba(239, 68, 68, 0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
