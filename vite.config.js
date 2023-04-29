import {
	defineConfig
} from 'vite';

export default defineConfig({
	optimizeDeps: {
		disabled: true
	},
	server: {
		hmr: false
	},
	resolve: {
		alias: {
			'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.min.mjs'
		}
	}
});