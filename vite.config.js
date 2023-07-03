import {
	defineConfig
} from 'vite';

const resolver = require('./thing-editor/electron-main/resolver/resolver.js');

export default defineConfig({
	server: {
		hmr: false,
		watch: {
			ignored: [
				'games/**/.tmp/**',
				'games/**/debug/**',
				'games/**/release/**'
			]
		},
		strictPort: 5173
	},
	plugins: [
		resolver
	],
	esbuild: {
		keepNames: true
	},
	resolve: {
		dedupe: [
			'thing-editor/**'
		],

		alias: {
			'libs': __dirname + '/libs',
			'games': __dirname + '/games',
			'thing-editor': __dirname + '/thing-editor',
			'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.mjs',
			'preact': __dirname + '/node_modules/preact/dist/preact.module.js'
		}
	}
});