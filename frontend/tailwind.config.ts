import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Status colors
        status: {
          normal: '#52c41a',
          warning: '#faad14',
          critical: '#f5222d',
          paused: '#bfbfbf',
          info: '#1890ff',
        },
        // Brand colors
        brand: {
          50: '#e6f7ff',
          100: '#bae7ff',
          200: '#91d5ff',
          300: '#69c0ff',
          400: '#40a9ff',
          500: '#1890ff',
          600: '#096dd9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
      },
      height: {
        'header': '60px',
        'footer': '40px',
      },
      minHeight: {
        'content': 'calc(100vh - 60px - 40px)',
      },
    },
  },
  plugins: [],
};

export default config;
