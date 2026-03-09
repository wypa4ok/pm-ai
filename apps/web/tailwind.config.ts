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
        surface: {
          DEFAULT: "#1c1c20",
          alt: "#161618",
          deep: "#0e0e10",
          raised: "#232328",
        },
        border: {
          DEFAULT: "#2e2e34",
          hover: "#3e3e46",
        },
        accent: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
          muted: "#f59e0b20",
        },
        text: {
          primary: "#e5e5e5",
          secondary: "#a3a3a3",
          muted: "#737380",
        },
      },
    },
  },
  plugins: [],
};

export default config;
