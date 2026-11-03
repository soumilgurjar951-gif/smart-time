/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ODRMS core palette
        // Midnight Blue — primary dark surfaces: sidebar, navigation, headers, banners
        midnight: {
          50: '#EEF2F7',
          100: '#DCE5F0',
          200: '#BDCCE2',
          300: '#8FABCE',
          400: '#5E85B5',
          500: '#3D6398',
          600: '#2A4D7E',
          700: '#1E3A64',
          800: '#14294A',
          900: '#0B1F3A',
          950: '#04101F',
        },
        // Electric Blue — primary actions, active states, links, highlights
        electric: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        // Off-White — light content background
        offwhite: {
          DEFAULT: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
