/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Cairo', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f3f9',
          100: '#d9e0f0',
          200: '#b0bfe0',
          300: '#7d93c8',
          400: '#4d67a8',
          500: '#33498a',
          600: '#233464',
          700: '#1a2750',
          800: '#131c3d',
          850: '#0f1730',
          900: '#0b1122',
          950: '#070b18',
        },
        royal: {
          300: '#7b96ff',
          400: '#4f6bf2',
          500: '#2b47dd',
          600: '#1e35b0',
          700: '#182a8a',
        },
        indigo: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        electric: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        emerald: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        red: {
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        'glass-lg': '0 24px 64px rgba(0, 0, 0, 0.45)',
        glow: '0 0 32px -6px rgba(79, 107, 242, 0.45)',
        'glow-green': '0 0 32px -6px rgba(16, 185, 129, 0.5)',
        'glow-blue': '0 0 32px -6px rgba(14, 165, 233, 0.4)',
        inner: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '26px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
