/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#38bdf8",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#17317c",
          950: "#0b1d54",
        },
        aqua: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
        },
        mint: {
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        ink: {
          900: "#08132f",
          950: "#050b1d",
        },
      },
      boxShadow: {
        glow: "0 24px 80px -48px rgba(34, 211, 238, 0.85)",
        screen: "16px 22px 0 rgba(7, 23, 74, 0.38)",
        soft: "0 18px 48px -28px rgba(2, 8, 23, 0.6)",
      },
    },
  },
  plugins: [],
};
