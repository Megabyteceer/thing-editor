const moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;
module.exports = {
	name: 'thing-editor:resolver',
	transform(src, id) {
		if(id.indexOf('.c.ts?v=') > 0) {
			const query = '?import&v=' + id.split('.ts?v=')[1];
			src = src.replace(moduleImportFixer, (_substr, m1, m2) => {
				if(m1.indexOf('thing-editor/') >= 0) {
					return m1 + m2;
				}
				return m1 + query + m2;
			});
		}
		return {
			code: src,
			map: null
		}
	}
}

