// add vscode intellisense for injected methods
let patches = [];
const PATCH_BEGIN = ` // thing-editor patch begin
`;

patch(
	'class DisplayObject extends PIXI.utils.EventEmitter {',
	`
	/** returns object rotation relative to it's scene */
	getGlobalRotation():number;
	getScenePosition(resultPoint: PIXI.Point, skipUpdate: boolean): PIXI.Point;
	getRootContainer(): PIXI.Container;
	detachFromParent():void;
	/** call in only in your own init methods as super.init(); */
	protected init():void;
	/** call in only in your own update methods as super.update(); */
	protected update():void;
	/** remove object from scene */
	protected remove():void;
	/** destructor */
	protected onRemove():void;
	addFilter(filter: PIXI.Filter):void;
	removeFilter(filter: PIXI.Filter):void;
	gotoLabelRecursive(labelName:string);
	isCanBePressed:boolean;
	findParentByType(classType: typeof PIXI.Container): PIXI.Container;
	findParentByName(name: string): PIXI.Container;
	
	/** search child recursively by it's name */
	findChildByName(name:string):Container;
	/** search all children of defined type recursively */
	findChildrenByType(classType: typeof Container):Container[];
	/** search all children by name */
	findChildrenByName(name: string):Container[];
	forAllChildren (callback: (o:Container)=>void):void;
	
	`);
	
patch(
	'class Sprite extends PIXI.Container {',
	`
	image: string;
	`);
	
patch(
	'class Text extends PIXI.Sprite {',
	`
	setAlign(align:string):void;
	`);

function patch(find, insert) {
	patches.push(find);
	patches.push(find + PATCH_BEGIN + insert + `
	// thing-editor patch end
`);
}

const path = require('path');
const fs = require('fs');
const wss = require('./server-socket.js');

function applyPatchesToFile(folder) {
	let fn = path.join(folder, 'node_modules/pixi.js-legacy/pixi.js-legacy.d.ts');
	if(fs.existsSync(fn)) {
		let txt = fs.readFileSync(fn, 'utf8');
		let isChanged = false;
		if(txt.indexOf(PATCH_BEGIN) > 0) {
			return;
		}
		for(let i = 0; i < patches.length; i += 2) {
			let find = patches[i];
			let insert = patches[i + 1];
			if(txt.indexOf(find) > 0) {
				txt = txt.replace(find, insert);
				isChanged = true;
			} else {
				console.error('PIXI typings patch "' + find + '" was not applied: ' + fn);
			}
		}

		if(isChanged) {
			fs.writeFileSync(fn, txt);
			console.log('PIXI typings patched: ' + fn);
			wss.notify('PIXI typings patched: ' + fn);
		} else {
			console.error('PIXI typings was not patched: ' + fn);
			wss.notify('PIXI typings was not patched: ' + fn);
		}
	}
}


module.exports = function(projectRoot) {
	projectRoot = path.join(__dirname, '../..', projectRoot);
	applyPatchesToFile(path.join(__dirname, '..'));
	while(fs.existsSync(projectRoot)) {
		applyPatchesToFile(projectRoot);
		let parentPath = path.join(projectRoot, '..');
		if(parentPath === projectRoot) {
			break;
		}
		projectRoot = parentPath;
	}
}