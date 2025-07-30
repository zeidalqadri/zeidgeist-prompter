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
        // Custom colors used in components
        'white-pure': '#ffffff',
        'white-soft': '#f8fafc',
        'black-primary': '#000000',
        'black-rich': '#1a1a1a',
        'gray-10': '#f1f5f9',
        'gray-30': '#cbd5e1',
        'gray-60': '#64748b',
      },
    },
  },
  plugins: [],
} satisfies Config;
