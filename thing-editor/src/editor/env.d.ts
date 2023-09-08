/// <reference types="vite/client" />

import { Container, Point } from "pixi.js";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import { FileDescClass } from "thing-editor/src/editor/fs";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";

type CallBackPath = string;
type ValuePath = string;
type CallBackParsedData = {
	/** callback path names*/
	p: (string | { s: string })[];
	/** callback parameter */
	v?: any[]
}

interface GameData { // eslint-disable-line @typescript-eslint/no-empty-interface

}

interface NodeExtendData {

	hidden?: true;

	childrenExpanded?: boolean;

	deepness?: number;
	isSelected?: boolean;

	treeNodeView?: TreeNode;

	isPrefabReference?: string;

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

	hideAllChildren?: boolean;

	hidePropsEditor?: {
		title: string,
		visibleFields: KeyedMap<true>
	};

	tmpGlobalPos?: Point;

	statusWarnOwnerId?: number;

	objectDeleted?: string;

	__allRefsDeletionValidator?: number;

	__isJustCloned?: boolean;

	__isPreviewMode?: boolean;

	__pathBreakpoint?: any;

	__fragmentOwnerId?: number;
}

type FSCallback = Uint8Array | undefined | FileDesc[] | ProjectDesc[] | number | boolean;

type KeyedObject = { [key: string]: any };

type SerializedDataValidationError = undefined | {
	message: string,
	findObjectCallback: ((o: Container) => boolean),
	fieldName?: string,
	errorCode?: number
};

type SerializedObjectProps = KeyedObject;

interface Constructor {
	new(): Container | {
		[key: string]: any;
	};
}

interface SourceMappedConstructor extends Constructor {
	/**
	 * @deprecated name can be wrong for PIXI objects use __className instead
	 */
	name: string
	__sourceFileName?: string;
	__defaultValues: KeyedObject;
	__requiredComponents?: Constructor[];
	__EDITOR_icon?: string;
	__classAsset: FileDescClass;
	__editableProps: EditablePropertyDesc[];
	__editablePropsRaw: EditablePropertyDescRaw[];
	/** additional way to disable editable properties */
	__isPropertyDisabled?: (p: EditablePropertyDesc) => string | undefined;
	__EDITOR_tip?: string;
	__isScene: boolean;
	__sourceCode: string[];
	__canAcceptChild: (Class: SourceMappedConstructor) => boolean;
	__beforeChangeToThisType?: (o: Container) => void;

	__validateObjectData?: (data: KeyedObject) => SerializedDataValidationError;

	/** added because pixi exports classes with wrong names */
	__className: string;
}

interface GameClasses {
	[key: string]: SourceMappedConstructor;
}

type KeyedMap<T> = {
	[key: string]: T;
}

type SerializedObject = {
	/** constructor class name */
	c?: string,

	/** prefab reference name */
	r?: string,

	p: SerializedObjectProps,
	':'?: SerializedObject[] | undefined,
}

type ThingEditorServer = { // exposed from electron
	fs: (command: string, filename?: string | string[], content?: string | boolean, ...args?: any[]) => FSCallback;
	fsAsync: (command: string, filename?: string | string[], content?: string | boolean, ...args?: any[]) => Promise<any>;
	versions: KeyedObject;
	onServerMessage: (_onServerMessage: (event: string, ...args: any[]) => void) => void;
	argv: string[];
}

type AnyType = any;

/** signals for DataPathChooser and CallbackPathChooser */
interface SelectableProperty extends AnyType {
	___EDITOR_isHiddenForChooser?: true | string
	___EDITOR_isHiddenForCallbackChooser?: true
	___EDITOR_isHiddenForDataChooser?: true
	___EDITOR_isGoodForChooser?: true
	___EDITOR_isGoodForCallbackChooser?: true
	___EDITOR_ChooserOrder?: true
	___EDITOR_callbackParameterChooserFunction?: (owner: any) => Promise<any[] | any>
}

declare global {
	let thingEditorServer: ThingEditorServer // exposed from electron
}



/** sound name, duration */
type SoundAssetEntry = [soundName: string, duration: number];

interface AssetsDescriptor {
	scenes: KeyedMap<SerializedObject>;
	prefabs: KeyedMap<SerializedObject>;
	images: string[];
	sounds: SoundAssetEntry[];
	text?: KeyedObject;
	projectDesc?: ProjectDesc;
}

throw new Error('env.d.ts should not be imported.');