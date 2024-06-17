import {
	defineConfig
} from 'vite';

const resolver = require('./thing-editor/electron-main/resolver/resolver.js');

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

export default defineConfig({
	server: {
		hmr: false,
		watch: IS_CI_RUN ? {
			ignored: [
				'**/**'

			]
		} : {
			ignored: [
				'**/node_modules/**',
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
		preserveSymlinks: true,
		alias: {
			'libs': __dirname + '/libs',
			'games': __dirname + '/games',
			'thing-editor': __dirname + '/thing-editor',
			'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.mjs'
		}
	}
});
