const ifDefPlugin = require('./vite-plugin-ifdef/if-def-loader.js');
const path = require('path');
const {ViteImageOptimizer} = require('vite-plugin-image-optimizer');

module.exports = (root, publicDir, outDir, debug, _projectDesc) => {
	return {
		root: root + '/.tmp',
		publicDir,
		base: './',
		esbuild: {
			target: 'ES2015'
		},
		plugins: [
			ifDefPlugin(debug),
			ViteImageOptimizer({})
		],
		build: {
			target: 'ES2015',
			emptyOutDir: true,
			minify: !debug,
			outDir,
			rollupOptions: {
				input: ''
			},
		},
		resolve: {
			alias: {
				'game-root': root,
				'games': path.resolve(__dirname, '../../games'),
				'libs': path.resolve(__dirname, '../../libs'),
				'thing-editor': path.resolve(__dirname, '../../thing-editor'),
				'howler.js': 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js',
				'pixi.js': 'https://cdn.jsdelivr.net/npm/pixi.js-legacy@7.2.4/dist/pixi-legacy.min.mjs'
			}
		}
	};
};
