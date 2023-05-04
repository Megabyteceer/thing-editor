// add vscode intellisense for injected methods
let patches = [];
const PATCH_BEGIN = ` // thing-editor patch begin
`;

patch(
	'node_modules/@pixi/display/lib/DisplayObject.d.ts',
	'', /*to the beginning*/
	`import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { EditorExtendData } from 'thing-editor/src/editor/env';
	
`
);

patch(
	'node_modules/@pixi/display/lib/DisplayObject.d.ts',
	'export declare abstract class DisplayObject extends utils.EventEmitter<DisplayObjectEvents> {',
	`
	/** returns object rotation relative to it's scene */
	getGlobalRotation():number;
	getScenePosition(resultPoint: Point, skipUpdate: boolean): Point;
	getRootContainer(): Container;
	detachFromParent():void;
	/** call in only in your own init methods as super.init(); */
	protected init():void;
	/** call in only in your own update methods as super.update(); */
	protected update():void;
	/** remove object from scene */
	remove():void;
	/** remove object from scene without placing empty object in place of it */
	removeWithoutHolder():void;
	/** destructor */
	protected onRemove():void;
	addFilter(filter: Filter):void;
	removeFilter(filter: Filter):void;
	gotoLabelRecursive(labelName:string);
	isCanBePressed:boolean;
	findParentByType<T extends Container>(classType: new () => T): T;
	findParentByName(name: string): Container;
	
	/** search child recursively by it's name */
	findChildByName(name:string):Container;
	/** search all children of defined type recursively */
	findChildrenByType<T extends Container>(classType: new () => T):T[];
	/** search all children by name */
	findChildrenByName(name: string):Container[];
	forAllChildren (callback: (o:Container)=>void):void;
	
	_thing_initialized: boolean;

    __beforeDeserialization?(): void;
    __beforeSerialization?(): void;
    __afterDeserialization?(): void;
    __afterSerialization?(data: SerializedObject): void;

    __beforeDestroy?(): void;

    __exitPreviewMode?(): void;
    __onUnselect?(): void;

	___pathBreakpoint?: string;

	__nodeExtendData: { [key: string]: any };

	/** debug info about object */
	___info: string;

	`);

patch(
	'node_modules/@pixi/sprite/lib/Sprite.d.ts',
	'export declare class Sprite extends Container {',
	`
	image: string;
	`);

patch(
	'node_modules/@pixi/text/lib/Text.d.ts',
	'export declare class Text extends Sprite {',
	`
	setAlign(align:string):void;
	`);

function patch(fileName, find, insert) {
	patches.push({
		fileName,
		find,
		insert: find + PATCH_BEGIN + insert + `
	// thing-editor patch end
`});
}

const path = require('path');
const fs = require('fs');
const {dialog} = require("electron");

function tryToPatch(folder) {
	for(let patch of patches) {
		var fn = path.join(folder, patch.fileName);
		if(fs.existsSync(fn)) {
			patch.done = true;
			let txt = fs.readFileSync(fn, 'utf8');
			if(txt.indexOf(PATCH_BEGIN) > 0) {
				continue;
			}

			let find = patch.find;
			let insert = patch.insert;
			if(txt.indexOf(find) > 0) {
				txt = txt.replace(find, insert);
				fs.writeFileSync(fn, txt);
				console.log('PIXI typings patched: ' + fn);
			} else {
				console.error('PIXI typings patch "' + find + '" was not applied: ' + fn);
				dialog.showErrorBox('PIXI typing patch error', 'PIXI typings patch "' + find + '" was not applied: ' + fn);
			}
		}
	}
}

module.exports = function () {
	projectRoot = path.join(__dirname, '../..');
	tryToPatch(path.join(__dirname, '..'));
	while(fs.existsSync(projectRoot)) {
		tryToPatch(projectRoot);
		let parentPath = path.join(projectRoot, '..');
		if(parentPath === projectRoot) {
			break;
		}
		projectRoot = parentPath;
	}
	for(let patch of patches) {
		if(!patch.done) {
			console.error('PIXI typings was not found: ' + patch.fileName);
			wss.notify('PIXI typings was not found: ' + patch.fileName);
		}
	}
};
