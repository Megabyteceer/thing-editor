import {
	defineConfig
} from 'vite';

export default defineConfig({
	server: {
		hmr: false,
		watch: {
			ignored: [
				'games/**/debug/**',
				'games/**/release/**'
			]
		}
	},
	esbuild: {
		keepNames: true,
		exclude: [
			'games/**/debug/',
			'games/**/release/'
		]
	},
	resolve: {
		dedupe: [
			'games/**/debug/',
			'games/**/release/',
			'thing-editor/'
		],

		alias: {
			'thing-editor': __dirname + '/thing-editor',
			'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.mjs',
			'preact': __dirname + '/node_modules/preact/dist/preact.module.js'
		}
	}
});