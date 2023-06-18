const path = require('path');
const fs = require('fs');

module.exports = {
	build: (projectDir, debug, assetsToCopy) => {

		const ifDefPlugin = require('./vite-plugin-ifdef/if-def-loader.js');
		const {ViteImageOptimizer} = require('vite-plugin-image-optimizer');


		const editorRoot = path.resolve(__dirname, '../..');
		const root = path.resolve(editorRoot, projectDir);
		const outDir = root + (debug ? "/debug" : "/release");
		const tmpDir = root + "/.tmp";
		const publicDir = tmpDir + "/public";
		const publicAssetsDir = publicDir + "/assets/";
		/* TODO clear old assets. Or include only existing assets
				if(fs.existsSync(publicDir)) {
					const oldTmpDir = publicDir + '_old';
					fs.renameSync(publicDir, oldTmpDir);
					fs.rm(publicDir, {recursive: true});
				}*/

		if(!fs.existsSync(publicDir)) {
			fs.mkdirSync(publicDir);
		}
		if(!fs.existsSync(publicAssetsDir)) {
			fs.mkdirSync(publicAssetsDir);
		}
		return Promise.all(assetsToCopy.map((asset) => {
			return new Promise((resolve, reject) => {
				const to = publicAssetsDir + asset.to;
				const dirName = path.dirname(to);
				if(!fs.existsSync(dirName)) {
					fs.mkdirSync(dirName, {recursive: true});
				}
				fs.copyFile(editorRoot + asset.from, to, (er) => {
					if(er) {
						debugger;
						reject(er);
					} else {
						resolve();
					}
				});
			});
		})).then(() => {
			return require('vite').build({
				root: root + '/.tmp',
				publicDir,
				base: './',
				esbuild: {
					target: "ES2015"
				},
				plugins: [
					ifDefPlugin(debug),
					ViteImageOptimizer({})
				],
				build: {
					emptyOutDir: true,
					minify: !debug,
					outDir,
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
			}).then((res) => {
				console.log('BUILD COMPLETE: ' + 'http://127.0.0.1:5173/' + projectDir);
				return res;
			});
		}).catch((er) => {
			debugger;
		});
	}
}

module.exports.build('games/game1/', true, [
	{
		from: "/libs/lib1/assets/flag.png",
		to: "flag.png",
	},
	{
		from: "/games/game1/assets/bunny.png",
		to: "bunny.png",
	},
]);