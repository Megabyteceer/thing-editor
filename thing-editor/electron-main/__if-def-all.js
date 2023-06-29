const {walkSync} = require("./editor-server-utils");
const ifDefLoader = require("./vite-plugin-ifdef/if-def-loader");
const fs = require("fs");


throw new Error("'if def all' is disabled. Too danger. Commit any changes before use it.");
/*
const files = walkSync(__dirname + '/../src').concat(walkSync(__dirname + '/../../games'));

const ifdef = ifDefLoader(true);

for(let fn of files) {
	if(fn.fileName.endsWith('.ts')) {
		let txt;
		if(fn.fileName.indexOf('thing-editor/src/editor') < 0) {
			txt = ifdef.load(fn.fileName);
		} else {
			txt = ' ';
		}
		if(txt) {
			fs.writeFileSync(fn.fileName, txt);
		}
	}
}*/