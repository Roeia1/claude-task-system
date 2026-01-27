/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: 'var(--bg-dark)',
          DEFAULT: 'var(--bg)',
          light: 'var(--bg-light)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        highlight: 'var(--highlight)',
        border: {
          DEFAULT: 'var(--border)',
          muted: 'var(--border-muted)',
        },
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        info: 'var(--info)',
      },
    },
  },
  plugins: [],
}
