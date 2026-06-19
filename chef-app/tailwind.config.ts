import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT:    '#BA7517',
          foreground: '#FFFFFF',
          hover:      '#9E6312',
          light:      'rgba(186,117,23,0.12)',
        },
        border:       '#EDE7DC',
        bg:           '#F5F2EE',
        card:         '#FFFFFF',
        muted:        '#706D6A',
        destructive: {
          DEFAULT:    '#DC2626',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
