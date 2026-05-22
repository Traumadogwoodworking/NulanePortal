import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        control: {
          50: "#f5f7ff",
          100: "#e6ecff",
          200: "#c6d1ff",
          300: "#a3b2ff",
          400: "#8398ff",
          500: "#657dff",
          600: "#4d63d9",
          700: "#3847b0",
          800: "#212c7c",
          900: "#10164f"
        }
      }
    }
  }
};

export default config;
