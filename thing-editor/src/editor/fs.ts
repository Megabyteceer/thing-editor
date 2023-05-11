import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import { FileDesc, KeyedObject } from "thing-editor/src/editor/env";

import { ThingEditorServer } from "thing-editor/src/editor/env";
import game from "thing-editor/src/engine/game";
const thingEditorServer: ThingEditorServer = window.thingEditorServer;

let typedFiles: Map<string, FileDesc[]> = new Map();

let allFiles: Map<string, FileDesc> = new Map();

const execFs = (command: string, filename?: string, content?: string, ...args: any[]) => {
	const ret = thingEditorServer.fs(command, filename, content, args);
	if(ret instanceof Error) {
		debugger;
		throw ret;
	}
	return ret;
}

export default class fs {

	static get __allFiles() {
		return allFiles;
	}

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
		return execFs('fs/saveFile', fileName, data as string);
	}

	static deleteFile(fileName: string) {
		return execFs('fs/delete', fileName);
	}

	static readJSONFile(fileName: string): any {
		return JSON.parse(fs.readFile(fileName));
	}

	static readFile(fileName: string) {
		return (execFs('fs/readFile', fileName) as any as string);
	}

	static editFile(_fileName: string) {
		// TODO:
	}

	static toggleDevTools() {
		execFs('fs/toggleDevTools');
	}

	static enumProjects(): ProjectDesc[] {
		return execFs('fs/enumProjects') as ProjectDesc[];
	}

	static refreshAssetsList(dirNames: string[]) {
		allFiles.clear();
		typedFiles.clear();
		for(let dirName of dirNames) {
			const files = execFs('fs/readDir', dirName) as FileDesc[];
			let dirNameWithSlash = dirName + '/';
			for(let file of files) {
				let wrongSymbol = fs.getWrongSymbol(file.fileName);
				if(wrongSymbol) {
					game.editor.warn("File " + file.fileName + " ignored because of wrong symbol '" + wrongSymbol + "' in it's name", 32044);
				}
				file.assetName = file.fileName.replace(dirNameWithSlash, '');
				file.fileName = '/' + file.fileName;
				allFiles.set(file.fileName, file);
			}
		}
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
		execFs('fs/exitWithResult', success, error)
	}

	static showQueston(title: string, message: string, yes: string, no: string): number {
		return execFs('fs/showQueston', title, message, yes, no) as number;
	}
}

