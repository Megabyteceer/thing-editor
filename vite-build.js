import path from 'path';
import {fileURLToPath} from 'url';
import {build} from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
(async () => {
	await build({
		root: path.resolve(__dirname, './thing-editor'),
		esbuild: {
			target: "ES2015"

		},
		build: {
			rollupOptions: {
				input: ""
			},
		},
		resolve: {
			dedupe: [
				'thing-editor'
			],



			alias: {
				'thing-editor': __dirname + '/thing-editor',
				'pixi.js': __dirname + '/node_modules/pixi.js/dist/pixi.mjs',
				'preact': __dirname + '/node_modules/preact/dist/preact.module.js'
			}
		}
	})
})()
