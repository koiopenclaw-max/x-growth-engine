/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f6f7fb',
          100: '#eef1f7',
          200: '#dbe2ef',
          800: '#1b2431',
          900: '#111827',
          950: '#090d14',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(148, 163, 184, 0.08), 0 20px 50px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
