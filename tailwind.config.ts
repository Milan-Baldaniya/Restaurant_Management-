import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#f2930d",
        "background-light": "#f8f7f5",
        "background-dark": "#120e0a",
        "glass-white": "rgba(255, 255, 255, 0.05)",
        "glass-border": "rgba(255, 255, 255, 0.1)",
      },
      fontFamily: {
        "display": ["Work Sans", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.75rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "2xl": "2rem",
        "full": "9999px"
      },
      boxShadow: {
        "3d-depth": "0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'bounce-subtle': 'bounceSubtle 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'bounce-3d': 'bounce3D 2.5s ease-in-out infinite',
        'spin-3d': 'spin3D 7s linear infinite',
        'shadow-pulse': 'shadowPulse 2.5s ease-in-out infinite'
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px #f2930d)' },
          '50%': { filter: 'drop-shadow(0 0 20px #f2930d)' },
        },
        bounce3D: {
          '0%, 100%': { transform: 'translateY(0) scale(1)', animationTimingFunction: 'ease-out' },
          '50%': { transform: 'translateY(-20px) scale(1.02)', animationTimingFunction: 'ease-in' },
        },
        spin3D: {
          '0%': { transform: 'rotateX(20deg) rotateY(0deg) rotateZ(-10deg)' },
          '25%': { transform: 'rotateX(25deg) rotateY(90deg) rotateZ(0deg)' },
          '50%': { transform: 'rotateX(20deg) rotateY(180deg) rotateZ(10deg)' },
          '75%': { transform: 'rotateX(25deg) rotateY(270deg) rotateZ(0deg)' },
          '100%': { transform: 'rotateX(20deg) rotateY(360deg) rotateZ(-10deg)' },
        },
        shadowPulse: {
          '0%, 100%': { transform: 'translateY(-8px) scale(0.9)', opacity: '0.5' },
          '50%': { transform: 'translateY(-8px) scale(1.05)', opacity: '0.9' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
    require('tailwindcss-animate'),
  ],
}

export default config
