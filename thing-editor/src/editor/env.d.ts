/// <reference types="vite/client" />
/// <reference path="../engine/components/container.c.ts" />

import { Container, Point } from "pixi.js";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";

type CallBackPath = string;
type ValuePath = string;
type CallBackParsedData = {
	/** callback path names*/
	p: (string | { s: string })[];
	/** callback parameter */
	v?: any[]
}

interface NodeExtendData {

	hidden?: true;

	childrenExpanded?: boolean;

	deepness?: number;
	isSelected?: boolean;

	isPrefabReference?: true; //TODO: prefabs without PrefabReference object

	constructorCalled?: boolean;

	/** unknown constructor's name */
	unknownConstructor?: string;

	unknownConstructorProps?: SerializedObjectProps;


	component_in_previewMode?: boolean;

	noSerialize?: boolean;

	serializationCache?: SerializedObject;

	isFaderShootCalledForThisFader?: boolean;

	hideAllChildren?: boolean;

	rotatorLocked?: boolean;//TODO

	hidePropsEditor?: {
		title: string,
		visibleFields: KeyedMap<true>
	};

	tmpGlobalPos?: Point;

	statusWarnOwnerId?: number;

	objectDeleted?: string;

	__allRefsDeletionValidator?: number;

	__isJustCloned?: boolean;
}

type FSCallback = Uint8Array | undefined | FileDesc[] | ProjectDesc[] | number;

type KeyedObject = { [key: string]: any };

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
	__EDITOR_icon?: string;
	__editableProps: EditablePropertyDesc[];
	__EDITOR_tip?: string; //TODO
	__isScene: boolean;
	__sourceCode: string[];
	__canAcceptChild: (Class: SourceMappedConstructor) => boolean; //TODO
	__beforeChangeToThisType?: (o: Container) => void;

	/** added because pixi exports classes with wrong names */
	__className: string;
}

type Classes = {
	[key: string]: SourceMappedConstructor;
}

type KeyedMap<T> = {
	[key: string]: T;
}

type SerializedObject = {
	/** constructor class name */
	c: string,
	p: SerializedObjectProps,
	':'?: SerializedObject[] | undefined,
}

type Scenes = {
	[key: string]: SerializedObject;
}

type Prefabs = {
	[key: string]: SerializedObject;
}

type ThingEditorServer = { // exposed from electron
	fs: (command: string, filename?: string, content?: string, ...args?: any[]) => FSCallback;
	versions: KeyedObject;
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
	var thingEditorServer: ThingEditorServer // exposed from electron
}

throw new Error('env.d.ts should not be imported.');