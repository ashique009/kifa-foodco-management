/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#172554', // Deep Navy
          dark: '#0F172A',
          hover: '#0F172A',
          light: '#1e3a8a',
          50: '#eff6ff',
          100: '#dbeafe',
          900: '#172554',
          950: '#0F172A',
        },
        accent: {
          DEFAULT: '#F59E0B', // Warm Orange
          dark: '#D97706',
          light: '#FEF3C7',
          hover: '#EAB308',
        },
        brand: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          text: '#111827',
          muted: '#64748B',
          border: '#E2E8F0',
        },
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#2563EB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        brand: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        tagline: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
