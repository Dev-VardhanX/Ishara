/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "var(--clay-bg, #E9EEF7)",
          surface: "var(--clay-surface, #F3F6FC)",
          primary: "var(--clay-primary, #7C9CFF)",
          secondary: "var(--clay-secondary, #FFB59E)",
          coral: "var(--clay-coral, #FF8A8A)",
          success: "var(--clay-success, #A8E6A1)",
          purple: "var(--clay-purple, #D4A5FF)",
          text: "var(--clay-text, #2B2D42)",
          muted: "var(--clay-muted, #6B7280)",
        },
      },
      borderRadius: {
        clay: "var(--clay-radius, 28px)",
        'clay-sm': "16px",
        'clay-lg': "36px",
      },
      boxShadow: {
        'clay-raised': "var(--clay-raised)",
        'clay-raised-sm': "var(--clay-raised-sm)",
        'clay-pressed': "var(--clay-pressed)",
        'clay-pressed-sm': "var(--clay-pressed-sm)",
      },
      fontFamily: {
        nunito: ["'Nunito'", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
}
