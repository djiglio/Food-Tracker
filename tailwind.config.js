/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Palette Premium Anti-AI (Zinc predominante per la dark mode, verde smeraldo per compliance)
        zinc: {
          850: '#202022',
          900: '#18181b', // Background principale
          950: '#09090b', // Background profondo
        },
        brand: {
          primary: '#10b981', // Smeraldo (Compliance OK)
          danger: '#ef4444', // Rosso (Fuori Target)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
