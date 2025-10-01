
import fs from 'fs';
import * as patcher from '../electron-main/pixi-typings-patch.js';

patcher.default();

if (!fs.existsSync('./games')) {
	fs.mkdirSync('./games');
}
if (!fs.existsSync('./libs')) {
	fs.mkdirSync('./libs');
}

if (!fs.existsSync('./thing-editor.code-workspace')) {
	fs.copyFileSync('./thing-editor.code-workspace.template', './thing-editor.code-workspace');
}
if (!fs.existsSync('./tsconfig.json')) {
	fs.copyFileSync('./tsconfig.json.template', './tsconfig.json');
}

fs.cpSync('./thing-editor/demo/example-project', './games/example-project', {recursive: true, force: false});
fs.cpSync('./thing-editor/demo/example-lib', './libs/example-lib', {recursive: true, force: false});

if (!fs.existsSync('./thing-editor/src/editor/current-classes-typings.ts')) {
	fs.writeFileSync('./thing-editor/src/editor/current-classes-typings.ts', 'export default {}');
}

if (!fs.existsSync('./thing-editor/src/editor/current-scene-typings.ts')) {
	fs.writeFileSync('./thing-editor/src/editor/current-scene-typings.ts', 'export default {}');
}

if (!fs.existsSync('./thing-editor/src/editor/localization-typings.ts')) {
	fs.writeFileSync('./thing-editor/src/editor/localization-typings.ts', 'export interface LocalizationKeys {}');
}