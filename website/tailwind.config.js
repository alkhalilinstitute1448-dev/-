/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['IBM Plex Sans Arabic', 'Cairo', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eef2ff',
          100: '#dfe7ff',
          200: '#c3d0fa',
          300: '#9db0e8',
          400: '#6f87c4',
          500: '#4a5f9d',
          600: '#2e3f73',
          700: '#1e2c52',
          800: '#16213E',
          850: '#10172E',
          900: '#0e1530',
          950: '#070B1E',
        },
        royal: {
          300: '#6EA8FF',
          400: '#5865F2',
          500: '#3F6BFF',
          600: '#2F54D9',
          700: '#2441a8',
        },
        indigo: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#5865F2',
          600: '#4f46e5',
        },
        electric: {
          300: '#6EA8FF',
          400: '#5a95f7',
          500: '#2e7bff',
          600: '#1f5fd1',
        },
        emerald: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#22C55E',
          600: '#16a34a',
        },
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',
        },
        red: {
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444',
        },
        gray: {
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35)',
        'glass-lg': '0 24px 64px rgba(0, 0, 0, 0.45)',
        glow: '0 0 32px -6px rgba(63, 107, 255, 0.45)',
        'glow-green': '0 0 32px -6px rgba(34, 197, 94, 0.5)',
        'glow-blue': '0 0 32px -6px rgba(46, 123, 255, 0.4)',
        inner: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '20px',
        '4xl': '26px',
      },
    },
  },
  plugins: [],
};
