/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f7f8',
          100: '#e3ebef',
          200: '#c5d5dd',
          300: '#97b4c2',
          400: '#628ea1',
          500: '#467286',
          600: '#3b5d6f',
          700: '#334e5c',
          800: '#2e424e',
          900: '#2a3943',
          950: '#162028',
        },
        accent: {
          DEFAULT: '#e85d04',
          soft: '#f48c06',
          muted: '#dc2f02',
        },
        surface: {
          DEFAULT: '#0f161c',
          raised: '#162028',
          overlay: '#1c2a33',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
