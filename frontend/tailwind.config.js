// tailwind.config.js
module.exports = {
  purge: [
    './pages/**/*.{js,ts,jsx,tsx,css}',
    './components/**/*.{js,ts,jsx,tsx,css}',
    './src/**/*.{js,ts,jsx,tsx,css}'
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors
        'light-bg': '#FBF7FA',        // blush white
        'light-surface': '#F0E4F5',   // pale lavender
        'light-primary': '#7B4A8E',   // rich purple
        'light-primary-hover': '#6A3D7A', // darker purple for hover
        'light-text': '#2B1A33',      // deep plum
        'light-text-secondary': '#5A3D63', // muted plum for secondary text
        'light-border': '#E0D0E8',    // very light purple border
        
        // Dark mode colors
        'dark-bg': '#13091A',         // purple-black
        'dark-surface': '#241633',    // deep aubergine
        'dark-primary': '#A674B8',    // soft violet
        'dark-primary-hover': '#B888C4', // lighter violet for hover
        'dark-text': '#F0E5F3',       // pale lavender-white
        'dark-text-secondary': '#C4B5CC', // muted lavender for secondary text
        'dark-border': '#3D2A4A',     // muted purple border
        
        // Accent colors (mode-independent)
        'star-gold': '#F59E0B',       // amber-500
        'star-gold-light': '#FCD34D', // amber-300
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(123, 74, 142, 0.08)',
        'card-hover': '0 4px 16px rgba(123, 74, 142, 0.12)',
        'card-dark': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-dark-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark', 'disabled'],
      textColor: ['dark', 'disabled'],
      borderColor: ['dark', 'disabled'],
      boxShadow: ['dark', 'hover'],
      opacity: ['disabled'],
      cursor: ['disabled'],
    },
  },
  plugins: [],
}