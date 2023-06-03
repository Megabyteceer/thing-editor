// add vscode intellisense for injected methods
let patches = [];
const PATCH_BEGIN = ` // thing-editor patch begin
`;

patch(
	'node_modules/@pixi/display/lib/DisplayObject.d.ts',
	'', /*to the beginning*/
	`import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { NodeExtendData } from 'thing-editor/src/editor/env';
	
`
	,
	'export declare abstract class DisplayObject extends utils.EventEmitter<DisplayObjectEvents> {',
	`
    
    /** returns object rotation relative to it's scene */
    getGlobalRotation(): number;
    getScenePosition(resultPoint: Point, skipUpdate: boolean): Point;
    getRootContainer(): Container;
    detachFromParent(): void;
    /** call in only in your own init methods as super.init(); */
    init(): void;
    /** call in only in your own update methods as super.update(); */
    update(): void;
    /** remove object from scene */
    remove(): void;
    /** remove object from scene without placing empty object in place of it */
    removeWithoutHolder(): void;
    /** destructor */
    onRemove(): void;
    addFilter(filter: Filter): void;
    removeFilter(filter: Filter): void;
    gotoLabelRecursive(labelName: string);
    isCanBePressed: boolean;
    findParentByType<T extends Container>(classType: new () => T): T | null;
    findParentByName(name: string): Container;

    /** search child recursively by it's name */
    findChildByName(name: string): Container | null;
    /** search all children of defined type recursively */
    findChildrenByType<T extends Container>(classType: new () => T): T[];
    /** search all children by name */
    findChildrenByName(name: string): Container[];
    forAllChildren(callback: (o: Container) => void): void;

    /** will be called when parent Trigger going to disabled state */
    _onDisableByTrigger?(): void;

    _thing_initialized: boolean;

    __beforeDeserialization?(): void;
    __beforeSerialization?(): void;
    __afterDeserialization?(): void;
    __afterSerialization?(data: SerializedObject): void;
    __beforeDestroy?(): void;

    __EDITOR_onCreate?(isWrapping?: boolean): void;

    __goToPreviewMode?(): void;
    __exitPreviewMode?(): void;
    __onSelect(): void;
    __onUnselect?(): void;
    __onChildSelected?(): void;
    __isAnyChildSelected(): boolean;

    "scale.x": number;
    "scale.y": number;
    "skew.x": number;
    "skew.y": number;
    "pivot.x": number;
    "pivot.y": number;


    __nodeExtendData: NodeExtendData;

    /** prevent object to be selected by viewport click. Editor only filed. */
    __lockSelection: boolean;

    /**hide children in editor TreeView window */
    __hideChildren?: boolean;

    /** node description editable in PropertyEditor window */
    __description?: string;

    /** debug info about object (exists in editor only)*/
    ___info: string;

    /** debug unic id of object  (exists in editor only)*/
    ___id: number;


	`);

patch(
	'node_modules/@pixi/sprite/lib/Sprite.d.ts',
	'export declare class Sprite extends Container {',
	`
	image: string;
	protected _imageID: string;

	__EDITOR_onCreate(isWrapping?: boolean): void;

	`);

patch(
	'node_modules/@pixi/text/lib/Text.d.ts',
	'export declare class Text extends Sprite {',
	`
	setAlign(align:string):void;
	`);

patch(
	'node_modules/@pixi/display/lib/Container.d.ts',
	'replace',
	'readonly children: T[];',
	'    readonly children: Container[];',
	'getChildAt(index: number): T;',
	'    getChildAt(index: number): Container;',
	'removeChildAt(index: number): T;',
	'    removeChildAt(index: number): Container;',
);

function patch(fileName, ...findInserts) {
	patches.push({
		fileName,
		findInserts
	});
};


const path = require('path');
const fs = require('fs');
const {dialog} = require("electron");

function tryToPatch(folder, mainWindow) {
	for(let patch of patches) {
		let isReplace = false;
		var fn = path.join(folder, patch.fileName);
		if(fs.existsSync(fn)) {
			patch.done = true;
			let txt = fs.readFileSync(fn, 'utf8');
			if(txt.indexOf(PATCH_BEGIN) >= 0) {
				continue;
			}

			let findInserts = patch.findInserts;
			while(findInserts.length > 0) {

				let find = findInserts.shift();
				if(find === 'replace') {
					isReplace = true;
					find = findInserts.shift();
				}
				let insert = findInserts.shift();

				insert = (isReplace ? '' : find) + PATCH_BEGIN + insert + `
	// thing-editor patch end
`;

				if(txt.indexOf(find) >= 0) {
					txt = txt.replace(find, insert);
					fs.writeFileSync(fn, txt);
					console.log('PIXI typings patched: ' + fn);
				} else {
					console.error('PIXI typings patch "' + find + '" was not applied: ' + fn);
					dialog.showMessageBoxSync(mainWindow, 'PIXI typing patch error', 'PIXI typings patch "' + find + '" was not applied: ' + fn);
				}
			}
		}
	}
}

module.exports = function (mainWindow) {
	projectRoot = path.join(__dirname, '../..');
	tryToPatch(path.join(__dirname, '..'));
	while(fs.existsSync(projectRoot)) {
		tryToPatch(projectRoot, mainWindow);
		let parentPath = path.join(projectRoot, '..');
		if(parentPath === projectRoot) {
			break;
		}
		projectRoot = parentPath;
	}
	for(let patch of patches) {
		if(!patch.done) {
			debugger;
			console.error('PIXI typings was not found: ' + patch.fileName);
			dialog.showMessageBoxSync(mainWindow, 'PIXI typings was not found: ' + patch.fileName);
		}
	}
};
