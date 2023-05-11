import fs from "thing-editor/src/editor/fs";

const SOURCES_CACHE: Map<string, string> = new Map();

const getPropertyDefinitionUrl = (fileName: string, fieldName: string): string => {
	if(!SOURCES_CACHE.has(fileName)) {
		SOURCES_CACHE.set(fileName, fs.readFile(fileName));
	}
	const src = (SOURCES_CACHE.get(fileName) as string).split('\n');

	let fieldRegExp1 = new RegExp('[\\s]' + fieldName + '[\\s=;:]');
	let fieldRegExp2 = new RegExp('_editableEmbed\\(\\S+,\\s*[\'"`]' + fieldName + '[\'"`]');
	src.some((line, i) => {
		var match = fieldRegExp1.exec(line);
		if(match) {
			if(i > 0 && src[i - 1].indexOf('@editable(') >= 0) {
				fileName += ':' + (i + 1) + ':' + match.index;
				return true;
			}
		}
		match = fieldRegExp2.exec(line);
		if(match) {
			fileName += ':' + (i + 1) + ':' + match.index;
			return true;
		}
	});

	return fileName;
}

const clearPropertyDifinitionCache = (fileName: string) => {
	SOURCES_CACHE.delete(fileName);
}

export { getPropertyDefinitionUrl, clearPropertyDifinitionCache }