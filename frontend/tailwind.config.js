/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Violet brand palette
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          // 600/700 are overridable at runtime via Admin → Settings → Branding
          600: 'var(--brand-600, #7c3aed)',
          700: 'var(--brand-700, #6d28d9)',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
};
