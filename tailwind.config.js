/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#e1b42d",
                "primary-dark": "#bfa040",
                "background-light": "#f8f7f6",
                "background-dark": "#171611",
                "surface-dark": "#2c281b",
                "surface-darker": "#211d11",
                "surface-highlight": "#383429",
                "text-muted": "#b7b19e",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "2xl": "2rem",
                "full": "9999px"
            },
            boxShadow: {
                "gold": "0 10px 30px -10px rgba(225, 180, 45, 0.3)",
                "glow": "0 0 15px rgba(225, 180, 45, 0.15)",
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
}
