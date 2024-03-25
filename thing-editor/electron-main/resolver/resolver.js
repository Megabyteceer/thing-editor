const moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

const queue = [];

if (IS_CI_RUN) {
	setInterval(() => {
		if (queue.length) {
			const o = queue.shift();
			o.next();
			console.log('resolved ' + o.url);
		}

	}, 50); // delay each response to prevent CI chrome crash
}

module.exports = {
	name: 'thing-editor:resolver',

	configureServer(server) {
		if (IS_CI_RUN) {
			server.middlewares.use((_req, _res, next) => {
				queue.push({next, url: _req.originalUrl});
			});
		}
	},

	transform(src, id) {

		if (id.indexOf('.ts?') > 0) {
			let query = id.split('.ts?')[1];
			query = '?' + query;

			src = src.replace(moduleImportFixer, (_substr, m1, m2) => {
				if (m1.indexOf('from \'games/') < 0 && m1.indexOf('from \'libs/') < 0) {
					return m1 + m2;
				}
				return m1 + query + m2;
			});
		}

		return {
			code: src,
			map: null
		};
	}
};
