/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-[#1A1A1A]',
    'text-[#666]',
    'text-[#1A1A1A]',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#F2F1EA',
        surface: '#FFFFFF',
        primary: '#EAD07D',
        secondary: '#1A1A1A',
        muted: '#888888',
        success: '#93C01F',
        'surface-hover': '#F8F8F6',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(180deg, #F2F1EA 0%, #FFFFFF 100%)',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(234, 208, 125, 0.3)',
      },
      animation: {
        'blob': 'blob 12s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'ripple': 'ripple 0.6s ease-out forwards',
        'gradient-x': 'gradient-x 3s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'grain': 'grain 0.5s steps(10) infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'border-glow': 'border-glow 2s ease-in-out infinite',
        'rotate-gradient': 'rotate-gradient 3s linear infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -30px) scale(1.05)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.95)' },
          '75%': { transform: 'translate(30px, 10px) scale(1.02)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        ripple: {
          '0%': { width: '0', height: '0', opacity: '0.5' },
          '100%': { width: '500px', height: '500px', opacity: '0' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-2%, -2%)' },
          '20%': { transform: 'translate(2%, 2%)' },
          '30%': { transform: 'translate(-2%, 2%)' },
          '40%': { transform: 'translate(2%, -2%)' },
          '50%': { transform: 'translate(-2%, 0)' },
          '60%': { transform: 'translate(2%, 0)' },
          '70%': { transform: 'translate(0, 2%)' },
          '80%': { transform: 'translate(0, -2%)' },
          '90%': { transform: 'translate(2%, 2%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(234, 208, 125, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(234, 208, 125, 0.5)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(234, 208, 125, 0.2)' },
          '50%': { borderColor: 'rgba(234, 208, 125, 0.6)' },
        },
        'rotate-gradient': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
        'marquee-vertical': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        'count-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
