/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#0D2847', 'secondary': '#FBBF24', 'accent': '#D97706',
        'background': '#111827', 'text-primary': '#F9FAFB', 'text-secondary': '#9CA3AF',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'], },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};