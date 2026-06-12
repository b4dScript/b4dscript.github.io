/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'Poppins', 'sans-serif'],
				mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
			},
			colors: {
				"cyber-black": "#0a0e14",
				"cyber-gray": "#11161d",
				"cyber-card": "#161c24",
				"neon-green": "#00C853",
				"neon-orange": "#f59e0b",
			},
			boxShadow: {
				'glow': '0 0 15px rgba(0, 200, 83, 0.4)',
				'glow-strong': '0 0 25px rgba(0, 200, 83, 0.6)',
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'glow': 'glow 2s ease-in-out infinite alternate',
			},
			keyframes: {
				glow: {
					'0%': { textShadow: '0 0 5px #00C853, 0 0 10px #00C853' },
					'100%': { textShadow: '0 0 10px #00C853, 0 0 20px #00C853, 0 0 30px #00C853' },
				}
			}
		},
	},
	plugins: [require("@tailwindcss/typography"),require("daisyui")],
	daisyui: {
		themes: [
			{
				cybersec: {
					"primary": "#00C853",
					"primary-content": "#0a0e14",
					"secondary": "#f59e0b",
					"secondary-content": "#0a0e14",
					"accent": "#00C853",
					"accent-content": "#0a0e14",
					"neutral": "#161c24",
					"neutral-content": "#c9d1d9",
					"base-100": "#0a0e14",
					"base-200": "#11161d",
					"base-300": "#161c24",
					"base-content": "#c9d1d9",
					"info": "#00C853",
					"success": "#00C853",
					"warning": "#f59e0b",
					"error": "#ff3333",
				}
			}
		],
		darkTheme: "cybersec",
		logs: false,
	}
}
