/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Archivo Black"', '"JetBrains Mono"', "sans-serif"],
      },
      letterSpacing: {
        brutal: "-0.02em",
      },
    },
  },
  plugins: [],
};
