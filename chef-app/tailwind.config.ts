import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT:    '#4F46E5',
          foreground: '#FFFFFF',
          hover:      '#4338CA',
          light:      'rgba(79,70,229,0.10)',
        },
        border:       '#E5E7EB',
        bg:           '#F3F4F6',
        card:         '#FFFFFF',
        muted:        '#6B7280',
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
      height: {
        'cell': '50px',  // Zellenhöhe für Dienstplan Kacheln (Schichten, Abwesenheiten, etc.)
      },
    },
  },
  plugins: [],
} satisfies Config
