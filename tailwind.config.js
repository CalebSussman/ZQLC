/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'universe-work': '#3b82f6',
        'universe-personal': '#10b981',
        'universe-home': '#f59e0b',
      },
    },
  },
  plugins: [],
}
