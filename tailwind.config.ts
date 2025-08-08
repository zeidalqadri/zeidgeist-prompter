import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Custom colors used in components - enhanced for accessibility
        'white-pure': '#ffffff',
        'white-soft': '#f5f5f5', /* Slightly darker for better contrast */
        'black-primary': '#000000',
        'black-rich': '#0a0a0a', /* Darker for better contrast */
        'gray-10': '#e8e8e8', /* Darker gray for better borders */
        'gray-30': '#9a9a9a', /* Much darker for WCAG compliance */
        'gray-60': '#4a4a4a', /* Much darker for WCAG AA compliance */
      },
    },
  },
  plugins: [],
} satisfies Config;
