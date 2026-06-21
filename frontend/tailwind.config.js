export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#080810',
        sidebar: '#0f0f1a',
        card: '#13131f',
        'card-hover': '#1a1a2e',
        ink: '#f0f0ff',
        'ink-dim': '#8888aa',
        accent: '#7c3aed',
        'accent-hover': '#6d28d9',
        'accent-glow': '#7c3aed33',
        teal: '#0891b2',
        success: '#059669',
        line: 'rgba(255,255,255,0.07)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        blink: { '0%,45%': { opacity: 1 }, '46%,100%': { opacity: 0 } },
        'bounce-dot': { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
      },
      maxWidth: {
        'screen-2xl': '1536px',
      },
      boxShadow: {
        'glow-accent': '0 10px 30px -10px rgba(124, 58, 237, 0.35)',
      }
    }
  },
  plugins: []
}
