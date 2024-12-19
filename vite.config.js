import {
	defineConfig
} from 'vite';

const resolver = require('./thing-editor/electron-main/resolver/resolver.js');

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

export default defineConfig({
	json: {
		stringify: true,
		namedExports: false
	},
	server: {
		hmr: false,
		watch: IS_CI_RUN ? {
			ignored: [
				'**/**'

			]
		} : {
			ignored: [
				'**/node_modules/**',
				'/**/.tmp/**',
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
		extensions: [ '.ts', '.js', '.mjs', '.json', '.jsx', '.tsx'],
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
	},
	define: {
		SPINE_SRC_PATH: JSON.stringify('/node_modules/pixi-spine/dist/pixi-spine.js')
	}
});
