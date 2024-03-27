
import {exec} from 'child_process';
import fs from 'fs';
import * as patcher from '../electron-main/pixi-typings-patch.js';

patcher.default();

if (!fs.existsSync('./games')) {
	fs.mkdirSync('./games');
}
if (!fs.existsSync('./libs')) {
	fs.mkdirSync('./libs');
}

fs.cpSync('./thing-editor/demo/example-project', './games/example-project', {recursive: true, force: false});
fs.cpSync('./thing-editor/demo/example-lib', './libs/example-lib', {recursive: true, force: false});


exec('git update-index --assume-unchanged thing-editor/src/editor/current-scene-typings.d.ts thing-editor/src/editor/prefabs-typing.ts');
