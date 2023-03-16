/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          "0%, 100%": {
            transform: "rotate(-0.5deg)",
          },
          "50%": {
            transform: "rotate(0.5deg)",
          },
        },
      },
      animation: {
        wiggle: "wiggle 400ms ease-in-out infinite",
      },
      transitionProperty: {
        width: "width",
      },
      colors: {
        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
        },
        secondary: {
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#ff00ff",
          400: "#bdbdbd",
          500: "#9e9e9e",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },
        back: {
          50: "rgb(var(--color-back-50) / <alpha-value>)",
          100: "rgb(var(--color-back-100) / <alpha-value>)",
          200: "rgb(var(--color-back-200) / <alpha-value>)",
          300: "rgb(var(--color-back-300) / <alpha-value>)",
          400: "rgb(var(--color-back-400) / <alpha-value>)",
          500: "rgb(var(--color-back-500) / <alpha-value>)",
          600: "rgb(var(--color-back-600) / <alpha-value>)",
          700: "rgb(var(--color-back-700) / <alpha-value>)",
          800: "rgb(var(--color-back-800) / <alpha-value>)",
          850: "rgb(var(--color-back-950) / <alpha-value>)",
          900: "rgb(var(--color-back-900) / <alpha-value>)",
          950: "rgb(var(--color-back-950) / <alpha-value>)",
          999: "rgb(var(--color-back-999) / <alpha-value>)",
        },
        muted : {
          50: "rgb(var(--color-muted-50) / <alpha-value>)",
          100: "rgb(var(--color-muted-100) / <alpha-value>)",
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
  darkMode: "class",
};
