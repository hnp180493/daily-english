/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#A78BFA',      // Purple
        secondary: '#F472B6',    // Pink
        accent: '#2DD4BF',       // Teal/Cyan
        success: '#34D399',      // Green
        warning: '#FBBF24',      // Amber
        danger: '#F87171',       // Red
        background: '#0A0E27',   // Deep dark blue
        surface: '#1A1F3A',      // Dark surface
        'surface-light': '#252B48', // Lighter surface
        text: '#E2E8F0',         // Light text
        'text-muted': '#94A3B8', // Muted text
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(167, 139, 250, 0.4), 0 0 40px rgba(167, 139, 250, 0.2)',
        'neon-pink': '0 0 20px rgba(244, 114, 182, 0.4), 0 0 40px rgba(244, 114, 182, 0.2)',
        'neon-cyan': '0 0 20px rgba(45, 212, 191, 0.4), 0 0 40px rgba(45, 212, 191, 0.2)',
        'glow': '0 8px 32px rgba(167, 139, 250, 0.3)',
        'glow-lg': '0 12px 48px rgba(167, 139, 250, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(167, 139, 250, 0.1)',
      },
    },
  },
  plugins: [],
}
