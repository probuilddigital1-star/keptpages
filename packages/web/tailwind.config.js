/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF4E8',
          alt: '#F3EBDB',
          surface: '#FFFDF7',
          warm: '#FBF6EE',
        },
        walnut: {
          DEFAULT: '#2C1810',
          secondary: '#6B5B4D',
          muted: '#9A8B7D',
        },
        terracotta: {
          DEFAULT: '#C65D3E',
          hover: '#B04E32',
          light: 'rgba(198,93,62,0.08)',
          glow: 'rgba(198,93,62,0.2)',
        },
        sage: {
          DEFAULT: '#5E7652',
          light: 'rgba(94,118,82,0.1)',
        },
        gold: {
          DEFAULT: '#B8923F',
          light: 'rgba(184,146,63,0.12)',
        },
        border: {
          DEFAULT: '#E5D9C8',
          light: '#EDE4D6',
        },
        aged: {
          paper: '#F0E2C8',
          dark: '#E4D3B4',
        },
        coffee: 'rgba(139,90,43,0.12)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Newsreader', 'serif'],
        ui: ['Outfit', 'sans-serif'],
        handwriting: ['Caveat', 'cursive'],
      },
      fontSize: {
        'hero': ['34px', { lineHeight: '1.15', fontWeight: '800' }],
        'hero-lg': ['52px', { lineHeight: '1.15', fontWeight: '800' }],
        'hero-xl': ['60px', { lineHeight: '1.15', fontWeight: '800' }],
        'section': ['30px', { lineHeight: '1.2', fontWeight: '600' }],
        'section-lg': ['38px', { lineHeight: '1.2', fontWeight: '600' }],
        'section-label': ['11px', { fontWeight: '600', letterSpacing: '2.5px' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        pill: '100px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(44,24,16,0.06)',
        md: '0 4px 16px rgba(44,24,16,0.08)',
        lg: '0 8px 32px rgba(44,24,16,0.1)',
        xl: '0 16px 48px rgba(44,24,16,0.12)',
        'btn-primary': '0 4px 16px rgba(198,93,62,0.25)',
        'btn-primary-hover': '0 8px 24px rgba(198,93,62,0.35)',
        'btn-light': '0 4px 20px rgba(0,0,0,0.15)',
      },
      spacing: {
        'section': '72px',
        'section-lg': '100px',
      },
      maxWidth: {
        'container-sm': '440px',
        'container-md': '680px',
        'container-lg': '800px',
        'container-xl': '1200px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.7s ease forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease',
        'slide-up': 'slideUp 300ms ease',
        'slide-in-right': 'slideInRight 300ms ease',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-6px) rotate(-1deg)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
