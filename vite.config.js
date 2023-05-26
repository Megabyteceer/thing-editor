import {
	defineConfig
} from 'vite';

export default defineConfig({
	server: {
		hmr: false
	},
	resolve: {
		dedupe: [
			'thing-editor'
		],



		alias: {
			'thing-editor': __dirname + '/thing-editor',
			'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.mjs',
			'preact': __dirname + '/node_modules/preact/'
		}
	}
});