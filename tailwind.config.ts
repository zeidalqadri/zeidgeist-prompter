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
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Mobile-specific breakpoints
        'touch': {'raw': '(hover: none) and (pointer: coarse)'},
        'ios': {'raw': '(max-width: 768px) and (-webkit-touch-callout: none)'},
        'landscape': {'raw': '(orientation: landscape)'},
        'portrait': {'raw': '(orientation: portrait)'},
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch-target': '44px',
      },
      minWidth: {
        'touch-target': '44px',
      },
    },
  },
  plugins: [],
} satisfies Config;
