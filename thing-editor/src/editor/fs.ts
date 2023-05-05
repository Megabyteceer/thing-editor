import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import { FileDesc, KeyedObject } from "thing-editor/src/editor/env";

import { ThingEditorServer } from "thing-editor/src/editor/env";
import game from "thing-editor/src/engine/game";
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

	static saveFile(fileName: string, data: string | Blob | KeyedObject) {
		if(typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fs.fieldsFilter, '	');
		}
		return thingEditorServer.fs('fs/saveFile', fileName, data as string);
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
		thingEditorServer.fs('fs/toggleDevTools');
	}

	static enumProjects(): ProjectDesc[] {
		return thingEditorServer.fs('fs/enumProjects') as ProjectDesc[];
	}

	static refreshAssetsList(dirNames: string[]) {
		allFiles.clear();
		for(let dirname of dirNames) {
			const files = thingEditorServer.fs('fs/readDir', dirname) as FileDesc[];
			for(let file of files) {
				let wrongSymbol = fs.getWrongSymbol(file.name);
				if(wrongSymbol) {
					game.editor.warn("File " + file.name + " ignored because of wrong symbol '" + wrongSymbol + "' in it's name", 32044);
				}
				allFiles.set(file.name, file);
			}
		}
	}

	static ready() {
		thingEditorServer.fs('fs/ready')
	}

	static getWrongSymbol(fileName: string) {
		let wrongSymbolPos = fileName.search(/[^a-zA-Z_\-\.\d\/]/gm);
		if(wrongSymbolPos >= 0) {
			return fileName[wrongSymbolPos];
		}
	}

	static fieldsFilter = (key: string, value: any) => {
		if(!key.startsWith('___')) {
			return value;
		}
	}

	static exitWithResult(success: string | undefined, error?: string) {
		thingEditorServer.fs('fs/exitWithResult', success, error)
	}
}

