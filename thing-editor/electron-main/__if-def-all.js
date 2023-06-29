const {walkSync} = require("./editor-server-utils");
const ifDefLoader = require("./vite-plugin-ifdef/if-def-loader");
const fs = require("fs");

const files = walkSync(__dirname + '/../src');

const ifdef = ifDefLoader(true);

for(let fn of files) {
	if(fn.fileName.endsWith('.ts') && fn.fileName.indexOf('thing-editor/src/editor') < 0) {
		const txt = ifdef.load(fn.fileName);
		if(txt) {
			fs.writeFileSync(fn.fileName, txt);
		}
	}
}