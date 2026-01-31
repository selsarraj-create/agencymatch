/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable manual dark mode
    theme: {
        extend: {
            colors: {
                brand: {
                    start: '#3B82F6',
                    end: '#8B5CF6',
                },
                surface: {
                    light: '#F2F4F7', // Light Gray
                    dark: '#000000',  // TikTok/Pure Black
                },
                card: {
                    light: '#FFFFFF',
                    dark: '#121212',
                },
                text: {
                    primary: {
                        light: '#111827', // Gray-900
                        dark: '#FFFFFF',
                    },
                    secondary: {
                        light: '#6B7280', // Gray-500
                        dark: '#9CA3AF', // Gray-400
                    }
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '3xl': '1.5rem', // For cards
            },
            animation: {
                'scan': 'scan 4s linear infinite',
            },
            keyframes: {
                scan: {
                    '0%': { top: '0%' },
                    '100%': { top: '100%' },
                }
            }
        },
    },
    plugins: [],
}
