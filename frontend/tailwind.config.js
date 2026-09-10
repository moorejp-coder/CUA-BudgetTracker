/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fbfaf7",
        surface: "#fffefd",
        "surface-raised": "#f5f0e7",
        "surface-sunken": "#f8f5ef",
        border: {
          DEFAULT: "#e9dcc5",
          subtle: "#eee7db",
        },
        income: "#3f825f",
        "income-deep": "#24573e",
        "income-bg": "#eaf3e9",
        expense: "#c85d43",
        "expense-bg": "#faece7",
        warning: "#b97815",
        "warning-bg": "#fdf1de",
        info: "#6ea4bb",
        "info-bg": "rgba(110,164,187,0.12)",
        accent: "#cf8e27",
        "accent-bg": "#fff5e3",
        "accent-soft": "#f1d9ae",
        ink: "#1d201d",
        "border-strong": "#ddc9a3",
        brand: {
          mark: "#dfa94b",
          "mark-border": "#d9a84f",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "16px",
      },
    },
  },
  plugins: [],
};
