import { FileDesc } from "thing-editor/src/editor/env";

import { ThingEditorServer } from "thing-editor/src/editor/env";
const thingEditorServer: ThingEditorServer = window.thingEditorServer;

let typedFiles: Map<string, FileDesc[]> = new Map();

let allFiles: Map<string, FileDesc> = new Map();

export default class fs {

	static getFiles(extension: string | string[]): FileDesc[] {
		let key;
		if(Array.isArray(extension)) {
			key = extension.join(':');
			if(!typedFiles.has(key)) {
				let a: FileDesc[] = [];
				const iterator1 = allFiles.keys();
				for(const fileName of iterator1) {
					for(let ext of extension) {
						if(fileName.endsWith(ext)) {
							a.push(allFiles.get(fileName) as FileDesc);
						}
					}
				}
				typedFiles.set(key, a);
			}
		} else {
			key = extension;
			if(!typedFiles.has(key)) {
				let a: FileDesc[] = [];
				const iterator1 = allFiles.keys();
				for(const fileName of iterator1) {
					if(fileName.endsWith(extension)) {
						a.push(allFiles.get(fileName) as FileDesc);
					}
				}
				typedFiles.set(key, a);
			}
		}
		return typedFiles.get(key) as FileDesc[];
	}

	static saveFile(fileName: string, content: string) {
		return thingEditorServer.fs('fs/saveFile', fileName, content);
	}

	static deleteFile(fileName: string) {
		return thingEditorServer.fs('fs/delete', fileName);
	}
	static readFile(fileName: string) {
		return thingEditorServer.fs('fs/readFile', fileName);
	}

	static editFile(_fileName: string) {
		// TODO:
	}

	static toggleDevTools() {
		thingEditorServer.fs('fs/toggleDevTools')
	}

	static refreshAssetsList(dirNames: string[]) {
		allFiles.clear();
		for(let dirname of dirNames) {
			const files = thingEditorServer.fs('fs/readDir', dirname) as FileDesc[];
			for(let file of files) {
				allFiles.set(file.name, file);
			}
		}
	}

	static ready() {
		thingEditorServer.fs('fs/frontend-ready')
	}
}