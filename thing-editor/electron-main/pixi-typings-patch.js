// add vscode intellisense for injected methods

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

let patches = [];
const PATCH_BEGIN = ` // thing-editor patch begin
`;

patch(
	'node_modules/@pixi/display/lib/DisplayObject.d.ts',

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

    _onRenderResize?();

    /** search child recursively by it's name */
    findChildByName(name: string): Container | undefined;
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
    __onIsMobileChange?(): void;
    __isAnyChildSelected(): boolean;

    __nodeExtendData: NodeExtendData;

    /** prevent object to be selected by viewport click. Editor only filed. */
    __doNotSelectByClick: boolean;

    /**hide children in editor TreeView window */
    __hideChildren?: boolean;

    /** hide object in viewport during editor mode */
    __hideInEditor?: boolean;

    /** node description editable in PropertyEditor window */
    __description?: string;

    /** debug info about object (exists in editor only)*/
    ___info: string;

    /** debug uniq id of object  (exists in editor only)*/
    ___id: number;

	__shiftObject?(dX, dY);
	
    /** added because pixi exports classes with wrong names */
    static __className: string;

    /**
     * @deprecated name can be wrong for PIXI objects use __className instead
     */
    static name: string;
    static __sourceFileName?: string;
    static __defaultValues: KeyedObject;
    static __requiredComponents?: Constructor[];
    static __EDITOR_icon?: string;
    static __classAsset: FileDescClass;
    static __editableProps: EditablePropertyDesc[];
    static __editablePropsRaw: EditablePropertyDescRaw[];

    /** additional way to disable editable properties */
    static __isPropertyDisabled?: (p: EditablePropertyDesc) => string | undefined;
    static __EDITOR_tip?: string;
    static __isScene: boolean;
    static __sourceCode: string[];
    static __canAcceptParent?: (parent: Container) => boolean;
    static __canAcceptChild?: (Class: SourceMappedConstructor) => boolean;
    static __beforeChangeToThisType?: (o: Container) => void;
    static __validateObjectData?: (data: KeyedObject) => SerializedDataValidationError;
	`);

patch(
	'node_modules/@pixi/sprite/lib/Sprite.d.ts',
	'export declare class Sprite extends Container {',
	`
	image: string;
	protected _imageID: string;

	__EDITOR_onCreate(isWrapping?: boolean): void;
	
	tintR: number;
	tintG: number;
	tintB: number;
	`);

patch(
	'node_modules/@pixi/mesh/lib/Mesh.d.ts',
	'export declare class Mesh<T extends Shader = MeshMaterial> extends Container {',
	`
	image: string;
	protected _imageID: string;

	tintR: number;
	tintG: number;
	tintB: number;

	`);

patch(
	'node_modules/@pixi/text/lib/Text.d.ts',
	'export declare class Text extends Sprite {',
	`
	setAlign(align:TextStyleAlign):void;
	translatableText: string | null;
	textTransform: number;
	maxWidth: number;

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
}


const path = require('path');
const fs = require('fs');
const {dialog} = require('electron');

function tryToPatch(folder, mainWindow) {
	for (let patch of patches) {
		let isReplace = false;
		var fn = path.join(folder, patch.fileName);
		if (fs.existsSync(fn)) {
			patch.done = true;
			let txt = fs.readFileSync(fn, 'utf8');
			if (txt.indexOf(PATCH_BEGIN) >= 0) {
				continue;
			}

			let findInserts = patch.findInserts;
			while (findInserts.length > 0) {

				let find = findInserts.shift();
				if (find === 'replace') {
					isReplace = true;
					find = findInserts.shift();
				}
				let insert = findInserts.shift();

				insert = (isReplace ? '' : find) + PATCH_BEGIN + insert + `
	// thing-editor patch end
`;

				if (txt.indexOf(find) >= 0) {
					txt = txt.replace(find, insert);
					fs.writeFileSync(fn, txt);
					console.log('PIXI typings patched: ' + fn);
				} else {
					console.error('PIXI typings patch "' + find + '" was not applied: ' + fn);
					if (mainWindow) {
						dialog.showMessageBoxSync(mainWindow, 'PIXI typing patch error', 'PIXI typings patch "' + find + '" was not applied: ' + fn);
					}
				}
			}
		}
	}
}

module.exports = function (mainWindow) {
	if (IS_CI_RUN) {
		return;
	}
	let projectRoot = path.join(__dirname, '../..');
	tryToPatch(path.join(__dirname, '..'));
	while (fs.existsSync(projectRoot)) {
		tryToPatch(projectRoot, mainWindow);
		let parentPath = path.join(projectRoot, '..');
		if (parentPath === projectRoot) {
			break;
		}
		projectRoot = parentPath;
	}
	for (let patch of patches) {
		if (!patch.done) {
			debugger;
			console.error('PIXI typings was not found: ' + patch.fileName);
			if (mainWindow) {
				dialog.showMessageBoxSync(mainWindow, 'PIXI typings was not found: ' + patch.fileName);
			}
		}
	}
};
