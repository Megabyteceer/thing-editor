/// <reference types="vite/client" />

import Editor from "thing-editor/src/editor/editor";

type FileDesc = {
	/** file name*/
	name: string,
	/** modification time*/
	mTime: number
};

type CallBackPath = string;
type ValuePath = string;
type CallBackParsedData = {
	/** callback path names*/
	p: (string | { s: string })[];
	/** callback parameter */
	v?: any[]
}

interface EditorExtendData {
	hidden?: true;

	isSelected?: boolean;

	isPrefabReference?: true; //TODO:

	constructorCalled: boolean;

	/** unknown constructor's name */
	unknownConstructor?: string;

	unknownConstructorProps?: SerializedObjectProps;


	component_in_previewMode: boolean;

	noSerialize: boolean;

	serializationCache?: SerializedObject;

}

type FSCallback = Uint8Array | undefined | FileDesc[];

type KeyedObject = { [key: string]: any };

type SerializedObjectProps = KeyedObject;

interface Constructor {
	new(): {
		[key: string]: any;
	};
}

interface SourceMappedConstructor extends Constructor {
	__sourceFileName?: string;
	__defaultValues: KeyedObject;
	__EDITOR_icon?: string;
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
	fs: (command: string, filename?: string, content?: string) => FSCallback;
	versions: KeyedObject;
	argv: string[]
}

declare global {
	var thingEditorServer: ThingEditorServer // exposed from electron
}

throw new Error('env.d.ts should not be imported.');