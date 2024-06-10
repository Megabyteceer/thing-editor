/* eslint-disable @typescript-eslint/consistent-type-imports */
/// <reference types="vite/client" />

type CallBackPath = string;
type ValuePath = string;
type CallBackParsedData = {
	/** callback path names*/
	p: (string | { c: string /** child name to getChildByName */})[];
	/** callback parameter */
	v?: any[];
};

interface GameData { // eslint-disable-line @typescript-eslint/no-empty-interface

}

interface NodeExtendData {

	hidden?: true;

	childrenExpanded?: boolean;

	deepness?: number;
	isSelected?: boolean;

	treeNodeView?: TreeNode;

	isPrefabReference?: string;

	/** tree will display objects of this children */
	childrenContainer?: import('pixi.js').Container;

	constructorCalled?: boolean;

	/** unknown constructor's name */
	unknownConstructor?: string;
	unknownConstructorProps?: SerializedObjectProps;

	/** unknown prefabs's name */
	unknownPrefab?: string;
	unknownPrefabProps?: SerializedObjectProps;

	component_in_previewMode?: boolean;

	noSerialize?: boolean;

	/** hide this object because of isolation mode */
	isolate?: boolean;

	serializationCache?: SerializedObject;

	isFaderShootCalledForThisFader?: boolean;

	hidePropsEditor?: {
		title: string;
		visibleFields: KeyedMap<true>;
	};

	tmpGlobalPos?: import('pixi.js').Point;

	statusWarnOwnerId?: number;

	objectDeleted?: string;

	__allRefsDeletionValidator?: number;

	__isJustCloned?: boolean;

	__isPreviewMode?: boolean;

	__pathBreakpoint?: any;

	isTypeChanging?: boolean;

	__fragmentOwnerId?: number;

	eatenRotation?: number;
}

type FSCallback = Uint8Array | undefined | FileDesc[] | ProjectDesc[] | number | boolean;

type KeyedObject = { [key: string]: any };

type SerializedDataValidationError = undefined | {
	message: string;
	findObjectCallback: ((o: import('pixi.js').Container) => boolean);
	fieldName?: string;
	errorCode?: number;
};

type SerializedObjectProps = KeyedObject;

type SourceMappedConstructor = typeof import('pixi.js').DisplayObject;

type KeyedMap<T> = {
	[key: string]: T;
};

type SerializedObject = {
	/** constructor class name */
	c?: string;

	/** prefab reference name */
	r?: string;

	p: SerializedObjectProps;
	':'?: SerializedObject[] | undefined;
};

type Electron_ThingEditorServer = { // exposed from electron
	fs: (command: string, filename?: string | string[] | number, content?: string | boolean, ...args?: any[]) => FSCallback;
	fsAsync: (command: string, filename?: string | string[], content?: string | boolean, ...args?: any[]) => Promise<any>;
	versions: KeyedObject;
	onServerMessage: (_onServerMessage: (event: string, ...args: any[]) => void) => void;
	argv: string[];
};

interface IEditablePropertyType {
	'data-path': true;
	'splitter': true;
	'rect': true;
	'callback': true;
	'l10n': true;
	'timeline': true;
	'ref': true;
	'btn': true;
	'color': true;
	'boolean': true;
	'string': true;
	'prefab': true;
	'pow-damp-preset': true;
	'number': true;
	'image': true;
	'sound': true;
}

declare const electron_ThingEditorServer: Electron_ThingEditorServer;

type AnyType = any;

/** signals for DataPathChooser and CallbackPathChooser */
interface SelectableProperty extends AnyType {
	___EDITOR_isHiddenForChooser?: true | string;
	___EDITOR_isHiddenForCallbackChooser?: true;
	___EDITOR_isHiddenForDataChooser?: true;
	___EDITOR_isGoodForChooser?: true;
	___EDITOR_isGoodForCallbackChooser?: true;
	___EDITOR_ChooserOrder?: true;
	___EDITOR_callbackParameterChooserFunction?: (owner: any) => Promise<any[] | any>;
}

declare global {
	let electron_ThingEditorServer: electron_ThingEditorServer; // exposed from electron
}

/** sound name, duration */
type SoundAssetEntry = [soundName: string, duration: number];

interface AssetsDescriptor {
	scenes: KeyedMap<SerializedObject>;
	prefabs: KeyedMap<SerializedObject>;
	images: string[];
	resources?: string[];
	xmls?: string[];
	fonts?: string[];
	sounds: SoundAssetEntry[];
	text?: KeyedObject;
	projectDesc?: ProjectDesc;
}

throw new Error('env.d.ts should not be imported.');
