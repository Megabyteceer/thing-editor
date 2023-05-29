import path from 'path';
import {fileURLToPath} from 'url';
import {build} from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url))

	; (async () => {
		await build({
			root: path.resolve(__dirname, './thing-editor/index.html'),
			base: '/thing-editor/',
			esbuild: {
				keepNames: true
			},
			build: {
				rollupOptions: {
					input: ""
				},
			},
		})
	})()
