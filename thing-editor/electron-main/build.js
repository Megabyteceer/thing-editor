const path = require('path');
const fs = require('fs');

const {walkSync} = require("./editor-server-utils");

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

		if(fs.existsSync(publicDir)) {
			let files = walkSync(publicDir);
			for(let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}
		if(fs.existsSync(outDir)) {
			let files = walkSync(outDir);
			for(let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}

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
						'libs': path.resolve(__dirname, '../../libs'),
						'thing-editor': path.resolve(__dirname, '../../thing-editor'),
						'howler.js': 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js',
						'pixi.js': 'https://cdn.jsdelivr.net/npm/pixi.js-legacy@7.2.4/dist/pixi-legacy.min.mjs'
					}
				}
			}).then((res) => {
				require('./static-server.js');
				console.log('BUILD COMPLETE: ' + 'http://localhost:5174/' + projectDir);
				return res;
			});
		});
	}
};

if(require.main === module) {
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
}