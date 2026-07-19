/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f5efe2",
          deep: "#ebe3d2",
          shade: "#ddd2bc",
          soft: "#faf6ec",
        },
        ink: {
          DEFAULT: "#1f1b16",
          soft: "#3a3530",
          mute: "#6b6359",
          wash: "#a39a8b",
        },
        vermillion: {
          DEFAULT: "#a8322d",
          deep: "#7a2420",
          soft: "#c4514a",
        },
        gold: {
          DEFAULT: "#a3824a",
          soft: "#c2a26b",
          deep: "#7a6235",
        },
        moss: "#5b6b4a",
        indigoInk: "#3a4a5a",
        plum: "#5d3a4a",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Noto Serif SC"', "Georgia", "serif"],
        song: ['"Noto Serif SC"', '"Cormorant Garamond"', "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
        brush: ['"Ma Shan Zheng"', '"Noto Serif SC"', "serif"],
      },
      boxShadow: {
        paper: "0 1px 0 rgba(31,27,22,0.04), 0 8px 24px -12px rgba(31,27,22,0.18)",
        "paper-lg":
          "0 1px 0 rgba(31,27,22,0.05), 0 18px 48px -20px rgba(31,27,22,0.28)",
        seal: "0 0 0 1px rgba(168,50,45,0.18), 0 6px 18px -6px rgba(168,50,45,0.32)",
        inset: "inset 0 0 0 1px rgba(31,27,22,0.08)",
      },
      backgroundImage: {
        "paper-grain":
          "radial-gradient(circle at 20% 30%, rgba(122,98,53,0.04) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(168,50,45,0.05) 0, transparent 45%)",
      },
      letterSpacing: {
        seal: "0.18em",
        editorial: "0.02em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "seal-press": {
          "0%": { transform: "scale(1.4) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(0.96) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        breathe: "breathe 2.6s ease-in-out infinite",
        "seal-press": "seal-press 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
      },
    },
  },
  plugins: [],
};
