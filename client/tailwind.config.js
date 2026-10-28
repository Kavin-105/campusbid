/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        campus: { 50: '#eefbf3', 100: '#d6f4dc', 500: '#1fbf75', 700: '#0c8a57' }
      }
    }
  },
  plugins: []
};
