/* eslint-disable @typescript-eslint/consistent-type-imports */
/// <reference types="vite/client" />

declare global {
	type CallBackPath = string;
	type ValuePath = string;
	type CallBackParsedData = {
		/** callback path names*/
		p: (string | { c: string /** child name to getChildByName */})[];
		/** callback parameter */
		v?: any[];
	};

	interface EditableRect {
		x: number;
		y: number;
		w: number;
		h: number;
	}

	type EditablePropertyType = keyof IEditablePropertyType;


	type SerializedDataValidationError = undefined | {
		message: string;
		findObjectCallback: ((o: import('pixi.js').Container) => boolean | undefined);
		fieldName?: string;
		errorCode?: number;
	};

	type SerializedObjectProps = KeyedObject;

	interface EditablePropertyDesc<T extends import('pixi.js').Container = import('pixi.js').Container> extends EditablePropertyDescRaw<T> {
		class: SourceMappedConstructor;
		type: EditablePropertyType;
		default: any;
		name: string;
		__src: string;
		__nullCheckingIsApplied?: true;
		renderer?: any;
	}

	interface EditablePropertyDescRaw<T extends import('pixi.js').DisplayObject = import('pixi.js').DisplayObject> {
		min?: number;
		max?: number;
		step?: number;
		type?: EditablePropertyType;
		name?: string;
		basis?: number;
		default?: any;
		canBeEmpty?: false;
		visible?: (o: T) => boolean;
		helpUrl?: string;
		/** field changes pass vale through this function  */
		parser?: (val: any) => any;
		disabled?: (o: T) => string | undefined | boolean | null;
		beforeEdited?: (val: any) => void | true | string;
		onBlur?: () => void;
		onClick?: (ev: any) => void;
		className?: string;
		hotkey?: import('./utils/hotkey').Hotkey;

		/** filter assets for selector */
		filterAssets?: (file: import('./fs').FileDesc) => boolean;

		/** splitter header */
		title?: string;
		animate?: true;
		select?: import('./ui/props-editor/props-editors/select-editor').SelectEditorItem[] | (() => import('./ui/props-editor/props-editors/select-editor').SelectEditorItem[]);
		noNullCheck?: true;
		important?: boolean;
		tip?: string | (() => string | undefined);
		afterEdited?: (val: any) => void;
		multiline?: boolean;
		notSerializable?: true;
		override?: true;
		filterName?: string;
		arrayProperty?: true;
		defaultArrayItemValue?: any;
		separator?: true;

		guideColor?: number;

		rectScaleIgnore?: true;

		rect_minX?: number;
		rect_maxX?: number;
		rect_minY?: number;
		rect_maxY?: number;
		rect_minW?: number;
		rect_maxW?: number;
		rect_minH?: number;
		rect_maxH?: number;

		/** call-back and data-path properties validator */
		isValueValid?: (val: any) => boolean;
	}

	type SourceMappedConstructor = typeof import('pixi.js').DisplayObject;

	type KeyedObject = { [key: string]: any };

	interface NodeExtendData {
		hidden?: true;

		childrenExpanded?: boolean;

		deepness?: number;
		isSelected?: boolean;

		treeNodeView?: import('./ui/tree-view/tree-node').default;

		/** defined in editor time only */
		isPrefabReference?: string;

		constructorCalled?: boolean;

		/** unknown constructor's name */
		unknownConstructor?: string;
		unknownConstructorProps?: SerializedObjectProps;

		/** unknown prefabs's name */
		unknownPrefab?: string;
		unknownPrefabProps?: SerializedObjectProps;

		__deserializedFromPrefab?: string;

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

		eatenRotation?: number;
	}

	type SerializedObject = {
		/** constructor class name */
		c?: string;

		/** prefab reference name */
		r?: string;

		__lastTouch?: number;

		p: SerializedObjectProps;
		':'?: SerializedObject[] | undefined;
	};

	type KeyedMap<T> = {
		[key: string]: T;
	};

	/** signals for DataPathChooser and CallbackPathChooser */
	interface SelectableProperty extends AnyType {
		___EDITOR_isHiddenForChooser?: true;
		___EDITOR_rejectionReason?: string;
		___EDITOR_isHiddenForCallbackChooser?: true;
		___EDITOR_isHiddenForDataChooser?: true;
		___EDITOR_isGoodForChooser?: true;
		___EDITOR_isGoodForCallbackChooser?: true;
		___EDITOR_ChooserOrder?: number;
		___EDITOR_actionIcon?: import('preact').ComponentChild;
		___EDITOR_callbackParameterChooserFunction?: (owner: any) => Promise<any[] | any>;
	}
}

export type FSCallback = Uint8Array | undefined | import('./fs').FileDesc[] | ProjectDesc[] | number | boolean;


export interface ClipboardAsset {
	name: string;
	type: import ('./fs').AssetType;
	l10n?: L10nEntryAsset;
	files: string[];
}

export type L10nEntryAsset = [key: string, text: KeyedMap<string>, projectPrefix?: string];

export interface IEditablePropertyType {
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
	'spine-sequence': true;
	'number': true;
	'image': true;
	'sound': true;
	'resource': true;
}

export interface IGoToLabelConsumer {
	gotoLabel(label: string): void;
	gotoLabelRecursive(label: string): void;
	__getLabels():undefined | string[];
}

export type AnyType = any;

/** sound name, duration */
export type SoundAssetEntry = [soundName: string, duration: number];

export interface AssetsDescriptor {
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
