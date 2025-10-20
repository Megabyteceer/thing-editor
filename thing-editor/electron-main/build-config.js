const ifDefPlugin = require('./vite-plugin-ifdef/if-def-loader.js');
const path = require('path');
const {ViteImageOptimizer} = require('vite-plugin-image-optimizer');

module.exports = (_root, publicDir, outDir, debug, _projectDesc) => {
	return {
		json: {
			namedExports: false
		},
		root: '.tmp',
		publicDir,
		base: './',
		esbuild: {
			target: 'ES2015'
		},
		plugins: [
			ifDefPlugin(debug),
			ViteImageOptimizer({
				logStats: false,
				test: /^((?!no-optimize).)*\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
				jpeg: {
					quality: _projectDesc.jpgQuality,
				},
				jpg: {
					quality: _projectDesc.jpgQuality,
				}
			})
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
		define: {
			SPINE_SRC_PATH: JSON.stringify('https://cdn.jsdelivr.net/npm/pixi-spine@4.0.4/dist/pixi-spine.js')
		},
		resolve: {
			alias: {
				'games': path.resolve(__dirname, '../../games'),
				'.tmp': path.resolve(__dirname, '../../.tmp'),
				'libs': path.resolve(__dirname, '../../libs'),
				'thing-editor': path.resolve(__dirname, '../../thing-editor'),
				'pixi.js': 'https://cdn.jsdelivr.net/npm/pixi.js@7.2.4/dist/pixi.min.mjs'
			}
		}
	};
};
