import { Container, Texture } from "pixi.js";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import type { KeyedObject, SerializedObject, SourceMappedConstructor, ThingEditorServer } from "thing-editor/src/editor/env";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import { __onAssetAdded, __onAssetDeleted, __onAssetUpdated } from "thing-editor/src/engine/lib";

interface FileDesc {
	/** file name*/
	fileName: string,
	assetName: string,
	assetType: AssetType,
	/** modification time*/
	mTime: number,

	lib?: string | null; //TODO
	v?: number;
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

interface FileDescImage extends FileDesc {
	asset: Texture;
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

let allAssets: FileDesc[] = [];

const assetsByTypeByName: Map<AssetType, Map<string, FileDesc>> = new Map();

for(let assetType of AllAssetsTypes) {
	let map = new Map();
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
ASSET_EXT_CROP_LENGHTS.set(AssetType.SOUND, 4);
ASSET_EXT_CROP_LENGHTS.set(AssetType.CLASS, 5);

const EMPTY: FileDescImage = {
	assetName: 'EMPTY',
	fileName: '/thing-editor/img/EMPTY.png',
	asset: Texture.EMPTY,
	assetType: AssetType.IMAGE,
	mTime: Number.MAX_SAFE_INTEGER
};

const WHITE: FileDescImage = {
	assetName: 'WHITE',
	fileName: '/thing-editor/img/WHITE.jpg',
	asset: Texture.WHITE,
	assetType: AssetType.IMAGE,
	mTime: Number.MAX_SAFE_INTEGER
};

const execFs = (command: string, filename?: string | string[], content?: string, ...args: any[]) => {
	const ret = thingEditorServer.fs(command, filename, content, ...args);
	if(ret instanceof Error) {
		debugger;
		throw ret;
	}
	return ret;
}

let lastAssetsDirs: string[];

let fileChangeDebounceTimeout = 0;
const fileChangeHandler = () => {
	fileChangeDebounceTimeout = 0;
	fs.refreshAssetsList();
};

thingEditorServer.onServerMessage((_ev: any, event: string, path: string) => {
	if(!game.editor.isProjectOpen) {
		return;
	}
	if(event === 'fs/change') {
		path = '/' + path.replace(/\\/g, '/');
		if(!ignoreFiles.has(path)) {
			if(fileChangeDebounceTimeout) {
				clearTimeout(fileChangeDebounceTimeout);
			}
			fileChangeDebounceTimeout = setTimeout(fileChangeHandler, 330);
		}
	}
});

const ignoreFiles = new Set();
function ignoreWatch(fileName: string) {
	ignoreFiles.add(fileName);
	setTimeout(() => {
		ignoreFiles.delete(fileName);
	}, 500);
}

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

	/** retunrs FileDesc of scene or prefab of given container */
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
		return game.editor.currentProjectAssetsDirRooted + assetName + (ASSET_TYPE_TO_EXT as KeyedObject)[assetType];
	}

	/** returns new mTime */
	static writeFile(fileName: string, data: string | Blob | KeyedObject): number {
		if(typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fs.fieldsFilter, '	');
		}
		return execFs('fs/saveFile', fileName, data as string) as number;
	}

	static saveAsset(assetName: string, assetType: AssetType, data: string | Blob | KeyedObject) {
		const fileName = fs.assetNameToFileName(assetName, assetType);
		ignoreWatch(fileName);
		const mTime = fs.writeFile(fileName, data);
		const file = fs.getFileByAssetName(assetName, assetType);
		if(file) {
			file.mTime = mTime;
			file.asset = data as SerializedObject;
			game.editor.ui.refresh();
		} else if(!assetName.startsWith(game.editor.backupPrefix)) {
			fs.refreshAssetsList();
		}
	}

	private static deleteFile(fileName: string) {
		return execFs('fs/delete', fileName);
	}

	static deleteAsset(assetName: string, assetType: AssetType) {
		const fileName = fs.assetNameToFileName(assetName, assetType);
		ignoreWatch(fileName);
		fs.deleteFile(fileName);
		fs.refreshAssetsList();
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

	static watchDirs(dirs: string[]) {
		execFs('fs/watchDirs', dirs);
	}

	static refreshAssetsList(dirNames?: string[]) {

		const isInitialization = dirNames;

		let prevAllAssets: FileDesc[] | undefined;
		let prevAllAssetsMap: Map<string, FileDesc>;


		if(!isInitialization) {
			dirNames = lastAssetsDirs;
			prevAllAssets = allAssets;
			prevAllAssetsMap = new Map();
			for(let f of prevAllAssets) {
				prevAllAssetsMap.set(f.fileName, f);
			}
		}

		console.log('refresh assets list');
		lastAssetsDirs = dirNames!;

		allAssets = [];

		for(let assetType of AllAssetsTypes) {
			assetsListsByType.set(assetType, []);
			assetsByTypeByName.get(assetType)?.clear();
		}

		(assetsListsByType.get(AssetType.IMAGE) as FileDesc[]).push(EMPTY, WHITE);
		allAssets.push(EMPTY, WHITE);
		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('EMPTY', EMPTY);
		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('WHITE', WHITE);

		for(let dirName of dirNames!) {
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

						if(prevAllAssets !== undefined && !file.assetName.startsWith(game.editor.backupPrefix)) {
							let oldAsset = prevAllAssetsMap!.get(file.fileName);
							if(!oldAsset) {
								__onAssetAdded(file);
							} else {
								file.asset = oldAsset.asset;

								file.v = (oldAsset.v || 0) + 1;

								if(oldAsset.mTime !== file.mTime) {
									__onAssetUpdated(file);
								}
							}
						}
						break;
					}
				}
			}
		}

		if(prevAllAssets) {
			for(let f of prevAllAssets) {
				if(!f.assetName.startsWith(game.editor.backupPrefix) && !fs.getFileByAssetName(f.assetName, f.assetType)) {
					__onAssetDeleted(f);
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

	static showQuestion(title: string, message: string, yes: string, no: string, cancel?: string): number {
		return execFs('fs/showQuestion', title, message, yes, no, cancel) as number;
	}
}

export { AssetType, AllAssetsTypes };
export type { FileDesc, FileDescClass, FileDescPrefab, FileDescScene, FileDescImage };

