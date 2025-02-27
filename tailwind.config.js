/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF", // Deep Blue (Scorecard)
        secondary: "#E11D48", // Red (Scorecard)
        background: "#FDF6EC", // Retro Beige (Background)
        accent: "#C084FC", // Purple Accent
        textDark: "#1E293B", // Deep Gray-Blue
        textLight: "#E5E7EB", // Light Gray
        cream: "#FAF5E9", // Vintage cream color for scorecards
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        retro: ['Courier New', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'], // Adding serif font for vintage look
      },
      borderRadius: {
        custom: "12px",
      },
    },
  },
  plugins: [],
};