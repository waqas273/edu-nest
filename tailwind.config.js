/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom colors can be added here if needed, 
      // but standard Slate/Gray scales work well for the requested theme.
    },
  },
  plugins: [],
}
