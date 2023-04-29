import { thingEditorServer } from "./editor.ts";
export default class fs {

	static saveFile(fileName: string, content: string) {
		return thingEditorServer.fs('fs/saveFile', fileName, content);
	}

	static readFile(fileName: string) {
		return thingEditorServer.fs('fs/readFile', fileName);
	}

	static toggleDevTools() {
		thingEditorServer.fs('fs/toggleDevTools')
	}
	
	static readDir(dirname: string):FileDesc[] {
		return  thingEditorServer.fs('fs/readDir', dirname) as FileDesc[];
	}

	static ready() {
		thingEditorServer.fs('fs/frontend-ready')
	}
}