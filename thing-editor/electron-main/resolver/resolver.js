const moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;
module.exports = {
	name: 'thing-editor:resolver',
	transform(src, id) {
		if (id.indexOf('.ts?') > 0) {
			let query = id.split('.ts?')[1];
			query = '?' + query;

			src = src.replace(moduleImportFixer, (_substr, m1, m2) => {
				if (m1.indexOf('from "games/') < 0 && m1.indexOf('from "libs/') < 0) {
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

