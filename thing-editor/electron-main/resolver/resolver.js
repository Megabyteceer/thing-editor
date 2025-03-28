const moduleImportFixer = /(^\s*import\s+[^"]*"[^"]+)(")/gm;

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

import path from 'path';

const gamesPath = path.join(__dirname, '../../../games').replaceAll('\\', '/') + '/';
const libsPath = path.join(__dirname, '../../../libs').replaceAll('\\', '/') + '/';

const queue = [];

if (IS_CI_RUN) {
	setInterval(() => {
		if (queue.length) {
			queue.shift()();
		}
	}, 50); // delay each response to prevent CI chrome crash
}

module.exports = {
	name: 'thing-editor:resolver',

	resolveId(id) {
		if (id.endsWith('thing-editor/src/editor/prefabs-typing')) {
			return 'thing-editor/src/editor/prefabs-typing';
		}
	},
	load(id) {
		if (id === 'thing-editor/src/editor/prefabs-typing') {
			return 'export default class TLib {}';
		}
	},

	configureServer(server) {
		if (IS_CI_RUN) {
			server.middlewares.use((_req, _res, next) => {
				queue.push(next);
			});
		}
	},
	transform(src, id) {
		if (id.includes('.ts?')) {
			let query = id.split('.ts?')[1];
			query = '?' + query;
			src = src.replace(moduleImportFixer, (_substr, m1, m2) => {
				if (!m1.includes('?')) {
					if (m1.includes('".')) { // relative imports treats games or libs if imported from games or libs
						if (id.startsWith(gamesPath) || id.startsWith(libsPath)) {
							return m1 + query + m2;
						}
					} else {
						if (m1.includes('"games/') || m1.includes('"libs/')) {
							return m1 + query + m2;
						}
					}
				}
				return _substr;
			});
		}

		return {
			code: src,
			map: null
		};
	}
};
