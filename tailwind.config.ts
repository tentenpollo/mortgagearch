import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d8e9ff",
          200: "#b9d7ff",
          300: "#89bbff",
          400: "#5496ff",
          500: "#2e74f4",
          600: "#1f57d6",
          700: "#1f47ad",
          800: "#203f88",
          900: "#22396c",
        },
      },
      boxShadow: {
        soft: "0 18px 45px -24px rgba(15, 23, 42, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
