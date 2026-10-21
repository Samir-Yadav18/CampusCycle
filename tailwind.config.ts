import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          accent: "#D4FF00", // Electric Volt Lime from Stitch design system
          cyan: "#00F0FF",
          primary: "#006699",
          primaryHover: "#005580",
          dark: "#080F1D",
          surface: "#0B1528",
          darkCard: "#0E1C34",
        },
        station: {
          green: "#34C759",
          lightGreen: "#E8F8EE",
          blue: "#0284C7",
          lightBlue: "#E0F2FE",
          orange: "#FF9500",
          red: "#FF3B30",
        },
        dock: {
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          subtle: "#F1F5F9",
        },
      },
      fontFamily: {
        space: ["'Space Grotesk'", "sans-serif"],
        hanken: ["'Hanken Grotesk'", "'Inter'", "sans-serif"],
        sans: ["'Hanken Grotesk'", "'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        glowVolt: "0 0 20px rgba(212, 255, 0, 0.35)",
        glowCyan: "0 0 20px rgba(0, 240, 255, 0.35)",
        glowGreen: "0 0 20px rgba(52, 199, 89, 0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scan 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
