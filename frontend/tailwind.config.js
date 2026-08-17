/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0d0c0a",
        surface: "#17140f",
        "surface-raised": "#211c15",
        "surface-sunken": "#090806",
        border: {
          DEFAULT: "#332c21",
          subtle: "#221d16",
        },
        income: "#4fae7b",
        "income-bg": "rgba(79,174,123,0.12)",
        expense: "#c6604a",
        "expense-bg": "rgba(198,96,74,0.12)",
        warning: "#e08a3c",
        "warning-bg": "rgba(224,138,60,0.12)",
        info: "#4fa3c4",
        "info-bg": "rgba(79,163,196,0.12)",
        accent: "#c99a4b",
        "accent-bg": "rgba(201,154,75,0.14)",
        ink: "#faf7f2",
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
