/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0b0e1a",
        surface: "#111524",
        "surface-raised": "#171c33",
        "surface-sunken": "#080a13",
        border: {
          DEFAULT: "#232948",
          subtle: "#1a1f38",
        },
        income: "#34d399",
        "income-bg": "rgba(52,211,153,0.12)",
        expense: "#f87171",
        "expense-bg": "rgba(248,113,113,0.12)",
        warning: "#fbbf24",
        "warning-bg": "rgba(251,191,36,0.12)",
        accent: "#5b8def",
        "accent-bg": "rgba(91,141,239,0.14)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        xl2: "16px",
      },
    },
  },
  plugins: [],
};
