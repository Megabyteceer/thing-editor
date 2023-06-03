import { Container, Texture } from "pixi.js";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import type { KeyedObject, SerializedObject, SourceMappedConstructor, ThingEditorServer } from "thing-editor/src/editor/env";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

interface FileDesc {
	/** file name*/
	fileName: string,
	assetName: string,
	assetType: AssetType,
	/** modification time*/
	mTime: number,

	lib: string | null; //TODO

	asset: SourceMappedConstructor | SerializedObject | Texture
};

interface FileDescClass extends FileDesc {
	asset: SourceMappedConstructor;
}
interface FileDescPrefab extends FileDesc {
	asset: SerializedObject;
}
interface FileDescScene extends FileDesc {
	asset: SerializedObject;
}

enum AssetType {
	IMAGE = "IMAGE",
	SOUND = "SOUND",
	SCENE = "SCENE",
	PREFAB = "PREFAB",
	CLASS = "CLASS"
}


const thingEditorServer: ThingEditorServer = window.thingEditorServer;

const AllAssetsTypes: AssetType[] = Object.values(AssetType);

const assetsListsByType: Map<AssetType, FileDesc[]> = new Map();

const allAssets: FileDesc[] = [];

const allAssetsMaps: (Map<string, FileDesc>)[] = [];
const assetsByTypeByName: Map<AssetType, Map<string, FileDesc>> = new Map();

for(let assetType of AllAssetsTypes) {
	let map = new Map();
	allAssetsMaps.push(map);
	assetsByTypeByName.set(assetType, map);
	assetsListsByType.set(assetType, []);
}

const ASSETS_PARSERS = {
	'.png': AssetType.IMAGE,
	'.jpg': AssetType.IMAGE,
	'.svg': AssetType.IMAGE,
	'.webp': AssetType.IMAGE,
	'.s.json': AssetType.SCENE,
	'.p.json': AssetType.PREFAB,
	'.wav': AssetType.SOUND,
	'.c.ts': AssetType.CLASS
};

const ASSET_TYPE_TO_EXT = {
	[AssetType.SCENE]: '.s.json',
	[AssetType.PREFAB]: '.p.json',
	[AssetType.CLASS]: '.c.ts'
};

const ASSET_EXT_CROP_LENGHTS: Map<AssetType, number> = new Map();
ASSET_EXT_CROP_LENGHTS.set(AssetType.IMAGE, 0);
ASSET_EXT_CROP_LENGHTS.set(AssetType.SCENE, 7);
ASSET_EXT_CROP_LENGHTS.set(AssetType.PREFAB, 7);
ASSET_EXT_CROP_LENGHTS.set(AssetType.SOUND, 7);
ASSET_EXT_CROP_LENGHTS.set(AssetType.CLASS, 5);

const execFs = (command: string, filename?: string, content?: string, ...args: any[]) => {
	const ret = thingEditorServer.fs(command, filename, content, ...args);
	if(ret instanceof Error) {
		debugger;
		throw ret;
	}
	return ret;
}

let lastAssetsDirs: string[];

export default class fs {

	static getAssetsList(assetType?: AssetType.IMAGE): FileDesc[]; //TODO IMAge
	static getAssetsList(assetType?: AssetType.CLASS): FileDescClass[];
	static getAssetsList(assetType?: AssetType.SCENE): FileDescScene[];
	static getAssetsList(assetType?: AssetType.PREFAB): FileDescPrefab[];
	static getAssetsList(assetType?: AssetType): FileDesc[];
	static getAssetsList(assetType: AssetType | null = null): FileDesc[] {
		if(assetType === null) {
			return allAssets;
		}
		return assetsListsByType.get(assetType) as FileDesc[];
	}

	static getFileOfRoot(object: Container): FileDescPrefab | FileDescScene {
		const root = object.getRootContainer() || game.currentContainer;
		const rootName = root.name as string;
		if(root instanceof Scene) {
			return this.getFileByAssetName(rootName, AssetType.SCENE);
		} else {
			return this.getFileByAssetName(rootName, AssetType.PREFAB);
		}
	}

	static getFileByAssetName(assetName: string, assetType: AssetType.IMAGE): FileDesc;
	static getFileByAssetName(assetName: string, assetType: AssetType.SCENE): FileDescScene;
	static getFileByAssetName(assetName: string, assetType: AssetType.PREFAB): FileDescPrefab;
	static getFileByAssetName(assetName: string, assetType: AssetType.SOUND): FileDesc;
	static getFileByAssetName(assetName: string, assetType: AssetType.CLASS): FileDescClass;
	static getFileByAssetName(assetName: string, assetType: AssetType): FileDesc;
	static getFileByAssetName(assetName: string, assetType: AssetType): FileDesc {
		return assetsByTypeByName.get(assetType)!.get(assetName) as FileDesc;
	}

	static assetNameToFileName(assetName: string, assetType: AssetType): string {
		const asset = (assetsByTypeByName.get(assetType) as Map<string, FileDesc>).get(assetName);
		if(asset) {
			return asset.fileName;
		}
		return game.editor.currentProjectAssetsDir + assetName + (ASSET_TYPE_TO_EXT as KeyedObject)[assetType];
	}

	/** returns new mTime */
	static saveFile(fileName: string, data: string | Blob | KeyedObject): number {
		if(typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fs.fieldsFilter, '	');
		}
		return execFs('fs/saveFile', fileName, data as string) as number;
	}

	static saveAsset(assetName: string, assetType: AssetType, data: string | Blob | KeyedObject) {
		const fileName = fs.assetNameToFileName(assetName, assetType);
		const mTime = fs.saveFile(fileName, data);
		const file = fs.getFileByAssetName(assetName, assetType);
		if(file) {
			file.mTime = mTime;
			file.asset = data as SerializedObject;
		} else {
			const newFile = {
				asset: data as SerializedObject,
				assetType,
				assetName,
				lib: null,
				mTime,
				fileName
			}
			assetsByTypeByName.get(assetType)!.set(assetName, newFile);
			fs.getAssetsList(assetType).push(newFile);
			allAssets.push(newFile);
		}
		return mTime;
	}

	static deleteFile(fileName: string) {
		return execFs('fs/delete', fileName);
	}

	static deleteAsset(assetName: string, assetType: AssetType) {
		allAssets.splice(allAssets.findIndex(f => f.assetName === assetName), 1);
		let list = fs.getAssetsList(assetType);
		list.splice(list.findIndex(f => f.assetName === assetName), 1);
		return fs.deleteFile(fs.assetNameToFileName(assetName, assetType));
	}

	static readJSONFile(fileName: string): any {
		return JSON.parse(fs.readFile(fileName));
	}

	static readFile(fileName: string) {
		return (execFs('fs/readFile', fileName) as any as string);
	}

	static toggleDevTools() {
		execFs('fs/toggleDevTools');
	}

	static enumProjects(): ProjectDesc[] {
		return execFs('fs/enumProjects') as ProjectDesc[];
	}

	static refreshAssetsList(dirNames: string[] = lastAssetsDirs) {
		lastAssetsDirs = dirNames;
		for(let map of allAssetsMaps) {
			map.clear();
		}
		allAssets.length = 0;

		for(let dirName of dirNames) {
			assert(dirName.endsWith('/'), 'dirName should end with slash "/". Got ' + dirName)
			const files = execFs('fs/readDir', dirName) as FileDesc[];
			for(let file of files) {
				let wrongSymbol = fs.getWrongSymbol(file.fileName);
				if(wrongSymbol) {
					game.editor.ui.status.warn("File " + file.fileName + " ignored because of wrong symbol '" + wrongSymbol + "' in it's name", 32044);
					continue;
				}
				let assetName = file.fileName.substring(dirName.length);
				for(const ext in ASSETS_PARSERS) {
					if(assetName.endsWith(ext)) {
						const assetType = (ASSETS_PARSERS as KeyedObject)[ext];

						file.assetName = assetName.substring(0, assetName.length - (ASSET_EXT_CROP_LENGHTS.get(assetType) as number));

						(assetsByTypeByName.get((ASSETS_PARSERS as KeyedObject)[ext] as AssetType) as Map<string, FileDesc>).set(file.assetName, file);
						file.fileName = '/' + file.fileName;
						file.assetType = assetType;
						(assetsListsByType.get(assetType) as FileDesc[]).push(file);
						allAssets.push(file);
						break;
					}
				}
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

	static showQueston(title: string, message: string, yes: string, no: string, cancel?: string): number {
		return execFs('fs/showQueston', title, message, yes, no, cancel) as number;
	}
}

export { AssetType, AllAssetsTypes };
export type { FileDesc, FileDescClass, FileDescPrefab, FileDescScene };

