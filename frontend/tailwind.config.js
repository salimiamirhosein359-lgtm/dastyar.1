/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lapis: { DEFAULT: '#101B33', light: '#1a2a4a', dark: '#0a1225' },
        paper: { DEFAULT: '#F7F5EF', dark: '#EDE9DF' },
        gold: { DEFAULT: '#B8934A', light: '#d4ad6a', dark: '#9a7a3a', hover: '#a8843f' },
        ink: { DEFAULT: '#1C1C1C', secondary: '#5B6B84', muted: '#8896A7' },
        stroke: { DEFAULT: '#E8E4DC', light: '#F0EDE6' },
      },
      fontFamily: {
        vazir: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(16,27,51,0.04), 0 4px 12px rgba(16,27,51,0.06)',
        'card-hover': '0 2px 8px rgba(16,27,51,0.06), 0 8px 24px rgba(16,27,51,0.1)',
        'glow': '0 0 20px rgba(184,147,74,0.15)',
      },
    },
  },
  plugins: [],
};
