const path = require('path');

module.exports = {
	build: (projectDir, debug) => {

		const ifDefPlugin = require('./vite-plugin-ifdef/if-def-loader.js');

		const root = path.resolve(__dirname, '../..', projectDir);

		return require('vite').build({
			root,
			base: './',
			esbuild: {
				target: "ES2015"
			},
			plugins: [ifDefPlugin(debug)],
			build: {
				minify: !debug,
				outDir: root + (debug ? "/debug" : "/release"),
				rollupOptions: {
					input: ""
				},
			},
			resolve: {
				alias: {
					'game-root': root,
					'games': path.resolve(__dirname, '../../games'),
					'thing-editor': path.resolve(__dirname, '../../thing-editor'),
					'pixi.js': path.resolve(__dirname, '../../node_modules/pixi.js-legacy/dist/pixi-legacy.min.mjs')
				}
			}
		}).catch((er) => {
			debugger;
		}).then((res) => {
			console.log('BUILD COMPLETE: ' + 'http://127.0.0.1:5173/' + projectDir);
			return res;
		});
	}
}

module.exports.build('games/game1/', true);