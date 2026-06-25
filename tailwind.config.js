/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#b45309', // Warm amber/gold for cosmetics
          light: '#f59e0b',
          dark: '#78350f',
        },
        secondary: {
          DEFAULT: '#db2777', // Rose cosmetics color
          light: '#f472b6',
          dark: '#9d174d',
        }
      }
    },
  },
  plugins: [],
}
