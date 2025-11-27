import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Inveon brand colors
        inveon: {
          primary: "#0066CC",
          secondary: "#00A8E8",
          accent: "#FF6B35",
          dark: "#1A1A2E",
          light: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};
export default config;

