/** @type {import('tailwindcss').Config} */
export default {
    content: ['./resources/views/**/*.blade.php', './resources/js/**/*.{js,jsx}'],

    theme: {
        extend: {
            colors: {
                // Midnight navy: primary surfaces, text, and primary actions.
                ink: {
                    950: '#0B1322',
                    900: '#101B30',
                    800: '#17243F',
                    700: '#22335A',
                    600: '#31466F',
                    500: '#4A5F86',
                    400: '#7C8CAB',
                    300: '#A9B4CB',
                },
                // Warm ivory: content surfaces.
                paper: {
                    DEFAULT: '#FBFAF6',
                    100: '#F5F2EA',
                    200: '#EBE6DA',
                    300: '#DAD3C3',
                },
                line: '#E3DED1',
                muted: '#5B6577',
                faint: '#6F7989',
                // Jade: positive actions and resolved states only.
                jade: {
                    50: '#EAF6F3',
                    100: '#D3ECE6',
                    300: '#7CCFBF',
                    500: '#12A08A',
                    600: '#0E8272',
                    700: '#0B6659',
                    800: '#094F45',
                },
                // Amber: waiting, warnings, high priority.
                amber: {
                    50: '#FDF5E4',
                    100: '#FAE8C4',
                    300: '#EBC06A',
                    600: '#B4690E',
                    700: '#8F5209',
                    800: '#6E3F07',
                },
                // Signal red: urgent, overdue, destructive.
                signal: {
                    50: '#FCEDEA',
                    100: '#F9D9D3',
                    300: '#EE9C90',
                    600: '#B93424',
                    700: '#962718',
                },
                // Steel blue: work in motion.
                steel: {
                    50: '#EDF2FA',
                    100: '#D9E3F3',
                    300: '#9DB4DA',
                    600: '#2F5597',
                    700: '#24437A',
                },
            },
            fontFamily: {
                sans: ['"Instrument Sans Variable"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
                display: ['"Newsreader Variable"', 'Georgia', 'Cambria', 'serif'],
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            fontSize: {
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
            },
            maxWidth: {
                site: '76rem',
            },
            keyframes: {
                'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
                'rise-in': {
                    from: { opacity: '0', transform: 'translateY(6px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 160ms ease-out both',
                'rise-in': 'rise-in 220ms ease-out both',
            },
        },
    },

    plugins: [],
};
