/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Menlo', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'macos': '10px',
      },
      transitionDuration: {
        'macos': '200ms',
      },
      backdropBlur: {
        'macos': '20px',
      },
    },
  },
  plugins: [],
}
