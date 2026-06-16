/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* DAD CODEX — Inkwell Vault palette (locked in design-system.md §1) */
        bg: {
          DEFAULT: '#13172a',
          soft: '#181d36',
          dusk: '#1f2542',
          card: '#2a3158',
          elev: '#363f6d',
          glass: 'rgba(31, 37, 66, 0.62)',
          deep: '#0a0b14',
          void: '#13172a',
          night: '#181d36',
        },
        gold: {
          DEFAULT: '#f4cf73',
          dim: '#c89934',
          soft: '#ffdb8a',
          deep: '#876318',
          glow: '#ffe9a3',
          burn: '#5e4413',
        },
        ink: {
          DEFAULT: '#f0e9d6',
          cream: '#f0e9d6',
          paper: '#dcd3bd',
          soft: '#a89e89',
          mute: '#7a7464',
          dim: '#4d4a40',
        },
        crimson: {
          DEFAULT: '#b13838',
          deep: '#6d1818',
          glow: '#e25656',
        },
        steel: {
          DEFAULT: '#6c7a92',
          dim: '#4b556a',
          soft: '#9aa6ba',
        },
        wave: {
          1: '#ffdb8a',
          2: '#6fa8d6',
          3: '#7fc08a',
        },
        troop: {
          inf: '#6fa8d6',
          cav: '#c9883e',
          arc: '#7fc08a',
        },
        skill: {
          conquest: '#a85cdb',
          expedition: '#5cb874',
        },
        danger: '#e25656',
        success: '#5cb874',
      },
      fontFamily: {
        display: ['"Cinzel Decorative"', 'Cinzel', 'Georgia', 'serif'],
        'display-clean': ['Cinzel', 'Georgia', 'serif'],
        sub: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(244,207,115,0.35), 0 12px 32px -10px rgba(244,207,115,0.30)',
        'gold-soft': '0 0 24px -6px rgba(255,219,138,0.28)',
        'gold-strong': '0 0 40px -4px rgba(255,233,163,0.42)',
        card: '0 20px 36px -22px rgba(0,0,0,0.55)',
        'card-elev': '0 32px 52px -22px rgba(0,0,0,0.65)',
        'card-hover': '0 28px 44px -18px rgba(0,0,0,0.75), 0 0 0 1px rgba(244,207,115,0.34)',
        inset: 'inset 0 1px 0 0 rgba(255,233,163,0.06)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #ffdb8a 0%, #f4cf73 50%, #c89934 100%)',
        'gold-shimmer':
          'linear-gradient(110deg, #c89934 0%, #ffdb8a 40%, #ffe9a3 50%, #ffdb8a 60%, #c89934 100%)',
        'crimson-gradient': 'linear-gradient(180deg, #b13838 0%, #6d1818 100%)',
        'crimson-radial':
          'radial-gradient(circle at center, rgba(177,56,56,0.22) 0%, transparent 70%)',
        'card-fade': 'linear-gradient(180deg, rgba(255,219,138,0.06) 0%, rgba(31,37,66,0.85) 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'mesh-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(30px, -20px)' },
          '66%': { transform: 'translate(-25px, 25px)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 24px -4px rgba(255,219,138,0.28)' },
          '50%': { boxShadow: '0 0 40px -2px rgba(255,233,163,0.5)' },
        },
        'countdown-tick': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in-up': 'fade-in-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 3s linear infinite',
        'mesh-drift': 'mesh-drift 80s ease-in-out infinite',
        ripple: 'ripple 1.6s ease-out infinite',
        float: 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3.2s ease-in-out infinite',
        'countdown-tick': 'countdown-tick 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
