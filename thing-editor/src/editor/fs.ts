import { FileDesc } from "thing-editor/src/editor/env";

import { ThingEditorServer } from "thing-editor/src/editor/env";
const thingEditorServer: ThingEditorServer = window.thingEditorServer;

export default class fs {

	static saveFile(fileName: string, content: string) {
		return thingEditorServer.fs('fs/saveFile', fileName, content);
	}

	static deleteFile(fileName: string) {
		return thingEditorServer.fs('fs/delete', fileName);
	}
	static readFile(fileName: string) {
		return thingEditorServer.fs('fs/readFile', fileName);
	}

	static toggleDevTools() {
		thingEditorServer.fs('fs/toggleDevTools')
	}

	static readDir(dirname: string): FileDesc[] {
		return thingEditorServer.fs('fs/readDir', dirname) as FileDesc[];
	}

	static ready() {
		thingEditorServer.fs('fs/frontend-ready')
	}
}