/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        /* ---- Reading Log design tokens (design.md §2) ---- */
        paper: '#F5F0E6',
        card2: '#FDFBF5',
        ink: {
          primary: '#0A2A5C',
          secondary: '#3D4E6B',
          muted: '#8A8FA3',
        },
        copper: {
          DEFAULT: '#A09070',
          soft: '#C9BBA0',
        },
        line: '#D9D2C2',
        heat: {
          0: '#EDE8DC',
          1: '#C7D3E4',
          2: '#93ABCB',
          3: '#5E7FAE',
          4: '#0A2A5C',
        },
        status: {
          want: '#A09070',
          reading: '#5E7FAE',
          done: '#0A2A5C',
        },
        sage: '#7A8B6F',
        danger2: '#A66A5E',
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Serif SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'serif'],
        sans: ['Inter', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 1px 2px rgba(10,42,92,0.04), 0 4px 16px rgba(10,42,92,0.05)',
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "colon-blink": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "colon-blink": "colon-blink 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
