/// <reference types="vite/client" />

import Editor from "./editor/editor";

type FileDesc = {
	/** file name*/
	name: string,
	/** modification time*/
	mTime: number
};

type FSCallback = Uint8Array | undefined | FileDesc[];

type ThingEditorServer = { // exposed from electron
	fs: (comand: string, filename?: string, content?: string) => FSCallback;
	versions: { [key: string]: string };
}

declare var editor: Editor;

declare global {
	interface Window {
		thingEditorServer: ThingEditorServer;
		editor: Editor;
	}
}

throw new Error('env.d.ts should not be imported.');