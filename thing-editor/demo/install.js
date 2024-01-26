
import fs from 'fs';

if(!fs.existsSync('./games')) {
	fs.mkdirSync('./games');
}
if(!fs.existsSync('./libs')) {
	fs.mkdirSync('./libs');
}

fs.cpSync('./thing-editor/demo/example-project', './games/example-project', {recursive: true, force: false});
fs.cpSync('./thing-editor/demo/example-lib', './libs/example-lib', {recursive: true, force: false});