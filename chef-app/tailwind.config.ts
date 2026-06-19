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
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'gradient-card':    'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        'gradient-hero':    'linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A855F7 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
