const forms = require("@tailwindcss/forms");
const typography = require("@tailwindcss/typography");
const containerQueries = require("@tailwindcss/container-queries");
const scrollbarHide = require("tailwind-scrollbar-hide");
const radix = require("tailwindcss-radix");
const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./public/index.html"],
  darkMode: ["class", '[data-theme="dark"]'],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        default: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "var(--brand, #b9ff66)",
          ink: "var(--brand-ink, #191a23)",
        },
        // dub tokens
        "bg-emphasis": "rgb(var(--bg-emphasis, 229 229 229) / <alpha-value>)",
        "bg-default": "rgb(var(--bg-default, 255 255 255) / <alpha-value>)",
        "bg-subtle": "rgb(var(--bg-subtle, 245 245 245) / <alpha-value>)",
        "bg-muted": "rgb(var(--bg-muted, 250 250 250) / <alpha-value>)",
        "bg-inverted": "rgb(var(--bg-inverted, 23 23 23) / <alpha-value>)",
        "border-emphasis": "rgb(var(--border-emphasis, 163 163 163) / <alpha-value>)",
        "border-default": "rgb(var(--border-default, 212 212 212) / <alpha-value>)",
        "border-muted": "rgb(var(--border-muted, 245 245 245) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle, 229 229 229) / <alpha-value>)",
        "content-inverted": "rgb(var(--content-inverted, 255 255 255) / <alpha-value>)",
        "content-muted": "rgb(var(--content-muted, 163 163 163) / <alpha-value>)",
        "content-subtle": "rgb(var(--content-subtle, 115 115 115) / <alpha-value>)",
        "content-default": "rgb(var(--content-default, 64 64 64) / <alpha-value>)",
        "content-emphasis": "rgb(var(--content-emphasis, 23 23 23) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out forwards",
        "fade-in-blur": "fade-in-blur 0.5s ease-out forwards",
        "scale-in-fade": "scale-in-fade 0.2s ease-out forwards",
        "slide-up-fade": "slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right-fade": "slide-right-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down-fade": "slide-down-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-left-fade": "slide-left-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-from-right": "slide-in-from-right 0.2s ease",
        "slide-out-to-right": "slide-out-to-right 0.2s ease",
      },
      keyframes: {
        "scale-in": {
          "0%": { transform: "scale(var(--from-scale,0.95))" },
          "100%": { transform: "scale(var(--to-scale,1))" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-blur": {
          "0%": { opacity: "0", filter: "blur(4px)" },
          "50%": { opacity: "0.5", filter: "blur(0px)" },
          "100%": { opacity: "1", filter: "blur(0px)" },
        },
        "scale-in-fade": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(var(--offset, 2px))" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right-fade": {
          "0%": { opacity: "0", transform: "translateX(var(--offset, -2px))" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down-fade": {
          "0%": { opacity: "0", transform: "translateY(var(--offset, -2px))" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-left-fade": {
          "0%": { opacity: "0", transform: "translateX(var(--offset, 2px))" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-to-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [forms, typography, scrollbarHide, radix, containerQueries, animate],
};
