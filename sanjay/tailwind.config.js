/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-sunken': 'var(--surface-sunken)',
        'surface-muted': 'var(--surface-muted)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        ink: {
          900: 'var(--ink-900)',
          600: 'var(--ink-600)',
          400: 'var(--ink-400)',
        },
        primary: {
          50: 'var(--primary-50)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
        },
        money: {
          50: 'var(--money-50)',
          600: 'var(--money-600)',
        },
        amber: {
          50: 'var(--amber-50)',
          600: 'var(--amber-600)',
        },
        danger: {
          50: 'var(--danger-50)',
          600: 'var(--danger-600)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        modal: '0 16px 40px -10px rgba(0, 0, 0, 0.65)',
        gold: '0 0 15px rgba(197, 160, 89, 0.25)',
      },
    },
  },
  plugins: [],
};
