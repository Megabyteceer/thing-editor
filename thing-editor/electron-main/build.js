
module.exports = {
	build: (projectDir, debug) => {
		return require('vite').build({
			root: __dirname + '/../../thing-editor',
			esbuild: {
				target: "ES2015"

			},
			build: {
				outDir: __dirname + "/release",
				rollupOptions: {
					input: ""
				},
			},
			resolve: {
				dedupe: [
					'thing-editor'
				],
				alias: {
					'thing-editor': __dirname + '/../thing-editor',
					'pixi.js': __dirname + '/../node_modules/pixi.js/dist/pixi.mjs',
					'preact': __dirname + '/../node_modules/preact/dist/preact.module.js'
				}
			}
		}).then((res) => {
			debugger;
		});
	}
}

module.exports.build();