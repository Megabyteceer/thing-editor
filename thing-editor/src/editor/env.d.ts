/// <reference types="vite/client" />

import Editor from "thing-editor/src/editor/editor";

type FileDesc = {
	/** file name*/
	name: string,
	/** modification time*/
	mTime: number
};

type FSCallback = Uint8Array | undefined | FileDesc[];

type ThingEditorServer = { // exposed from electron
	fs: (command: string, filename?: string, content?: string) => FSCallback;
	versions: { [key: string]: string };
}

declare global {
	var thingEditorServer: ThingEditorServer // exposed from electron
}

throw new Error('env.d.ts should not be imported.');