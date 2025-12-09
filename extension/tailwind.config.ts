import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'white-pure': '#ffffff',
        'white-soft': '#f5f5f5',
        'black-primary': '#000000',
        'black-rich': '#0a0a0a',
        'gray-10': '#e8e8e8',
        'gray-30': '#9a9a9a',
        'gray-60': '#4a4a4a',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
