import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        mint: "#d7f7df",
        pine: "#145240",
        coral: "#ff6b57",
        gold: "#f5b942",
        mist: "#eef3ee",
      },
      boxShadow: {
        panel: "0 12px 30px rgba(23, 32, 27, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

