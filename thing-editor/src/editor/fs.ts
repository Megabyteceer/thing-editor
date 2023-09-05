import { Container, Texture } from "pixi.js";
import { ComponentChildren } from "preact";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import type { KeyedObject, SerializedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import { editorEvents } from "thing-editor/src/editor/utils/editor-events";
import { EDITOR_BACKUP_PREFIX } from "thing-editor/src/editor/utils/flags";
import HowlSound from "thing-editor/src/engine/HowlSound";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import { __onAssetAdded, __onAssetDeleted, __onAssetUpdated } from "thing-editor/src/engine/lib";
import Scene from "thing-editor/src/engine/lib/assets/src/basic/scene.c";

interface LibInfo {
	name: string,
	dir: string,
	assetsDir: string,
	isEmbed?: boolean
}

interface FileDesc {
	/** file name*/
	fileName: string,
	assetName: string,
	assetType: AssetType,
	/** modification time*/
	mTime: number,
	lib: LibInfo | null,
	libInfoCache?: ComponentChildren,
	v?: number;
	asset: SourceMappedConstructor | SerializedObject | Texture | HowlSound | KeyedObject
}

interface FileDescClass extends FileDesc {
	asset: SourceMappedConstructor;
}
interface FileDescPrefab extends FileDesc {
	asset: SerializedObject;
}
interface FileDescScene extends FileDesc {
	asset: SerializedObject;
}

interface FileDescSound extends FileDesc {
	asset: HowlSound;
}
interface FileDescImage extends FileDesc {
	asset: Texture;
}
interface FileDescL18n extends FileDesc {
	asset: KeyedObject;
	dir: string;
	lang: string;
}

enum AssetType {
	IMAGE = "IMAGE",
	SOUND = "SOUND",
	SCENE = "SCENE",
	PREFAB = "PREFAB",
	CLASS = "CLASS",
	RESOURCE = "RESOURCE"
}

const AllAssetsTypes: AssetType[] = Object.values(AssetType);

const assetsListsByType: Map<AssetType, FileDesc[]> = new Map();

let allAssets: FileDesc[] = [];

const assetsByTypeByName: Map<AssetType, Map<string, FileDesc>> = new Map();

for(const assetType of AllAssetsTypes) {
	const map = new Map();
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
	'.json': AssetType.RESOURCE,
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
ASSET_EXT_CROP_LENGHTS.set(AssetType.RESOURCE, 5);

const EMPTY: FileDescImage = {
	assetName: 'EMPTY',
	fileName: '/thing-editor/img/EMPTY.png',
	asset: Texture.EMPTY,
	assetType: AssetType.IMAGE,
	mTime: Number.MAX_SAFE_INTEGER,
	lib: null
};

const WHITE: FileDescImage = {
	assetName: 'WHITE',
	fileName: '/thing-editor/img/WHITE.jpg',
	asset: Texture.WHITE,
	assetType: AssetType.IMAGE,
	mTime: Number.MAX_SAFE_INTEGER,
	lib: null
};

const execFs = (command: string, filename?: string | string[], content?: string | boolean, ...args: any[]) => {
	const ret = thingEditorServer.fs(command, filename, content, ...args);
	if(ret instanceof Error) {
		debugger;
		throw ret;
	}
	return ret;
}

const execFsAsync = (command: string, filename?: string | string[], content?: string | boolean, ...args: any[]) => {
	thingEditorServer.fsAsync(command, filename, content, ...args);
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
			if(path.endsWith('.ts')) {
				game.editor.classesUpdatedExternally();
			} else {
				fileChangeDebounceTimeout = setTimeout(fileChangeHandler, 330);
			}
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

const assetNameToFileName = (assetName: string, assetType: AssetType): string => {
	const asset = (assetsByTypeByName.get(assetType) as Map<string, FileDesc>).get(assetName);
	if(asset) {
		return asset.fileName;
	}
	return game.editor.currentProjectAssetsDirRooted + assetName + (ASSET_TYPE_TO_EXT as KeyedObject)[assetType];
}

const sortByMTime = (a: FileDesc, b: FileDesc) => {
	return b.mTime - a.mTime;
}

const sortAssets = () => {
	assetsListsByType.forEach((list) => {
		list.sort(sortByMTime);
	});

	allAssets.sort(sortByMTime);
}

export default class fs {

	static getAssetsList(assetType?: AssetType.SOUND): FileDescSound[];
	static getAssetsList(assetType?: AssetType.IMAGE): FileDescImage[];
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

	static getFileByAssetName(assetName: string, assetType: AssetType.IMAGE): FileDescImage;
	static getFileByAssetName(assetName: string, assetType: AssetType.SCENE): FileDescScene;
	static getFileByAssetName(assetName: string, assetType: AssetType.PREFAB): FileDescPrefab;
	static getFileByAssetName(assetName: string, assetType: AssetType.SOUND): FileDesc;
	static getFileByAssetName(assetName: string, assetType: AssetType.CLASS): FileDescClass;
	static getFileByAssetName(assetName: string, assetType: AssetType): FileDesc;
	static getFileByAssetName(assetName: string, assetType: AssetType): FileDesc {
		return assetsByTypeByName.get(assetType)!.get(assetName) as FileDesc;
	}

	/** returns new mTime */
	static writeFile(fileName: string, data: string | Blob | KeyedObject): number {
		if(typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fs.fieldsFilter, '	');
		}
		return execFs('fs/saveFile', fileName, data as string) as number;
	}

	static exists(fileName: string) {
		return execFs('fs/exists', fileName);
	}

	static copyFile(from: string, to: string) {
		return execFs('fs/copyFile', from, to);
	}

	static run(script: string, ...args: any[]) {
		return execFs('fs/run', script, undefined, args);
	}

	static copyAssetToProject(file: FileDesc) {
		if(file.assetType === AssetType.CLASS) {
			game.editor.ui.modal.showInfo('Class can not be copied to the project. Create a new class inherited from ' + (file as FileDescClass).asset.__className + ' instead.', 'Can not copy class.');
			return;
		}
		fs.copyFile(file.fileName, file.fileName.replace(file.lib!.assetsDir, game.editor.currentProjectAssetsDir));
		file.lib = null;
		game.editor.ui.refresh();
	}

	static saveAsset(assetName: string, assetType: AssetType, data: string | Blob | KeyedObject) {
		const fileName = assetNameToFileName(assetName, assetType);
		ignoreWatch(fileName);
		const mTime = fs.writeFile(fileName, data);
		const file = fs.getFileByAssetName(assetName, assetType);
		if(file) {
			file.mTime = mTime;
			file.asset = data as SerializedObject;
			sortAssets();
			game.editor.ui.refresh();
		} else if(!assetName.startsWith(EDITOR_BACKUP_PREFIX)) {
			fs.refreshAssetsList();
		}
		game.editor.scrollAssetInToView(assetName);
	}

	private static deleteFile(fileName: string) {
		return execFs('fs/delete', fileName);
	}

	static deleteAsset(assetName: string, assetType: AssetType) {
		const fileName = assetNameToFileName(assetName, assetType);
		fs.deleteFile(fileName);
		if(!assetName.startsWith(EDITOR_BACKUP_PREFIX)) {
			fs.refreshAssetsList();
		}
	}

	static readJSONFile(fileName: string): any {
		return JSON.parse(fs.readFile(fileName));
	}

	static readFile(fileName: string) {
		return (execFs('fs/readFile', fileName) as any as string);
	}

	static enumProjects(): ProjectDesc[] {
		return execFs('fs/enumProjects') as ProjectDesc[];
	}

	static browseDir(path: string): ProjectDesc[] {
		return execFs('fs/browseDir', path) as ProjectDesc[];
	}

	static build(projectDir: string, debug: boolean, copyAssets: { from: string, to: string }[]) {
		return execFsAsync('fs/build', projectDir, debug, copyAssets);
	}

	static watchDirs(dirs: string[]) {
		execFs('fs/watchDirs', dirs);
	}

	static isFilesEqual(fileName1: string, fileName2: string): boolean {
		return execFs('fs/isFilesEqual', fileName1, fileName2) as boolean;
	}

	static rebuildSoundsIfNeed(file: FileDesc) {
		if(file.assetType === AssetType.SOUND) {
			scheduledSoundsRebuilds.add(file.lib ? file.lib.dir : game.editor.currentProjectAssetsDir);
		}
	}

	static rebuildSounds(dir: string): object {
		const options = {
			dir,
			formats: game.editor.projectDesc.soundFormats,
			bitRates: game.editor.projectDesc.soundBitRates,
			defaultBitrate: game.editor.projectDesc.soundDefaultBitrate
		}
		return execFs('fs/sounds-build', options as any) as any;
	}

	static getFolderAssets(dirName: string): FileDesc[] {
		assert(dirName.endsWith('/'), 'dirName should end with slash "/". Got ' + dirName);

		const lib: LibInfo | null = game.editor.currentProjectLibs.find(l => l.assetsDir === dirName) || null;
		const files = execFs('fs/readDir', dirName) as FileDesc[];
		return files.filter((file) => {
			const wrongSymbol = fs.getWrongSymbol(file.fileName);
			if(wrongSymbol) {
				game.editor.ui.status.warn("File " + file.fileName + " ignored because of wrong symbol '" + wrongSymbol + "' in it's name", 32044);
				return;
			}
			const assetName = file.fileName.substring(dirName.length);
			for(const ext in ASSETS_PARSERS) {
				if(assetName.endsWith(ext)) {
					const assetType = (ASSETS_PARSERS as KeyedObject)[ext];
					file.assetName = assetName.substring(0, assetName.length - (ASSET_EXT_CROP_LENGHTS.get(assetType) as number));
					if(assetType === AssetType.CLASS) {
						file.assetName = file.assetName.replace(/-/g, '');
					}
					file.fileName = '/' + file.fileName;
					file.assetType = assetType;
					file.lib = lib;
					return true;
				}
			}
		});
	}

	static refreshAssetsList(dirNames?: string[]) {

		if(dirNames) {
			assert(!lastAssetsDirs, 'dirNames already defined.');
			lastAssetsDirs = dirNames;
		} else {
			assert(lastAssetsDirs, 'dirNames is not defined.');
			dirNames = lastAssetsDirs;
		}

		const prevAllAssets = allAssets;
		const prevAllAssetsMap = new Map();
		for(const f of prevAllAssets) {
			prevAllAssetsMap.set(f.fileName, f);
		}
		allAssets = [];

		console.log('refresh assets list');

		for(const assetType of AllAssetsTypes) {
			assetsListsByType.set(assetType, []);
			assetsByTypeByName.get(assetType)?.clear();
		}

		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('EMPTY', EMPTY);
		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('WHITE', WHITE);

		for(const dirName of dirNames!) {
			const files = fs.getFolderAssets(dirName);
			for(const file of files) {
				const map = assetsByTypeByName.get(file.assetType as AssetType) as Map<string, FileDesc>;
				if(file.assetType !== AssetType.CLASS && map.has(file.assetName)) {
					const existingFile = map.get(file.assetName)!;
					setTimeout(() => {
						if(fs.isFilesEqual(file.fileName, existingFile.fileName)) {
							game.editor.warnEqualFiles(file, existingFile);
						}
					}, 0);
				}
				map.set(file.assetName, file);
			}
		}

		for(const assetsMap of assetsByTypeByName.values()) {
			for(const file of assetsMap.values()) {
				(assetsListsByType.get(file.assetType) as FileDesc[]).push(file);
				allAssets.push(file);

				if(prevAllAssets !== undefined) {
					const oldAsset = prevAllAssetsMap!.get(file.fileName);
					if(!oldAsset) {
						fs.rebuildSoundsIfNeed(file);
						__onAssetAdded(file);
					} else {
						file.asset = oldAsset.asset;

						file.v = (oldAsset.v || 0) + 1;

						if(oldAsset.mTime !== file.mTime) {
							fs.rebuildSoundsIfNeed(file);
							__onAssetUpdated(file);
						}
					}
				}
			}
		}

		if(prevAllAssets) {
			for(const file of prevAllAssets) {
				if(!file.assetName.startsWith(EDITOR_BACKUP_PREFIX) && !fs.getFileByAssetName(file.assetName, file.assetType)) {
					fs.rebuildSoundsIfNeed(file);
					__onAssetDeleted(file);
				}
			}
		}

		sortAssets();

		let dirsToRebuildSounds = scheduledSoundsRebuilds.values();
		let soundsData: Map<string, KeyedObject> = new Map();
		for(let dir of dirsToRebuildSounds) {
			soundsData.set(dir, fs.rebuildSounds(dir));
		}
		scheduledSoundsRebuilds.clear();

		const sounds = this.getAssetsList(AssetType.SOUND);
		for(const file of sounds) {
			const soundsDirData = soundsData.get(file.lib ? file.lib.dir : game.editor.currentProjectAssetsDir)!;
			if(soundsDirData) {
				const sndData = soundsDirData.soundInfo[file.fileName.substring(1)];
				if(sndData) {
					file.asset.preciseDuration = sndData.duration;
				}
			}
		}
		editorEvents.emit('assetsRefreshed');
	}

	static getWrongSymbol(fileName: string) {
		const wrongSymbolPos = fileName.search(/[^a-zA-Z_\-\.\d\/]/gm);
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

const scheduledSoundsRebuilds: Set<string> = new Set();

export { AllAssetsTypes, AssetType };
export type { FileDesc, FileDescClass, FileDescImage, FileDescL18n, FileDescPrefab, FileDescScene, FileDescSound, LibInfo };

