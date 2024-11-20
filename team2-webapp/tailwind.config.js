/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'assistant': '#f0f0f0',
        'user': '#007bff',
        'error': '#dc3545',
      }
    },
  },
  plugins: [],
}
