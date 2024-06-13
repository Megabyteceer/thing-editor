import type { Container } from 'pixi.js';
import { Texture } from 'pixi.js';
import type { ComponentChildren } from 'preact';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import { EDITOR_BACKUP_PREFIX } from 'thing-editor/src/editor/utils/flags';
import type HowlSound from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import { __onAssetAdded, __onAssetDeleted, __onAssetUpdated } from 'thing-editor/src/engine/lib';
import Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

interface LibInfo {
	name: string;
	dir: string;
	libNum: number;
	assetsDir: string;
	isEmbed?: boolean;
}

const prefabNameFilter = /[^a-zA-Z\-\/0-9_]/g;

interface FileDesc {
	/** file name*/
	fileName: string;
	assetName: string;
	assetType: AssetType;
	/** modification time*/
	mTime: number;
	lib: LibInfo | null;
	libInfoCache?: ComponentChildren;
	v?: number;
	_hashedAssetName?: string;

	parentAsset?: FileDesc;

	asset: SourceMappedConstructor | SerializedObject | Texture | HowlSound | KeyedObject;
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
interface FileDescL10n extends FileDesc {
	asset: KeyedObject;
	dir: string;
	readOnly?: boolean;
	lang: string;
	__isLangIdPlaceHolder?: boolean;
	isDirty?: boolean;
}

enum AssetType {
	IMAGE = 'IMAGE',
	SOUND = 'SOUND',
	SCENE = 'SCENE',
	PREFAB = 'PREFAB',
	CLASS = 'CLASS',
	RESOURCE = 'RESOURCE',
	BITMAP_FONT = 'BITMAP_FONT',
	L10N = 'L10N',
	FONT = 'FONT',
}

const AllAssetsTypes: AssetType[] = Object.values(AssetType);

const assetsListsByType: Map<AssetType, FileDesc[]> = new Map();

let allAssets: FileDesc[] = [];

let prevAssetsByTypeByName: Map<AssetType, Map<string, FileDesc>>;
let assetsByTypeByName: Map<AssetType, Map<string, FileDesc>>;

const resetAssetsMap = () => {
	assetsByTypeByName = new Map();

	for (const assetType of AllAssetsTypes) {
		assetsByTypeByName.set(assetType, new Map());
		assetsListsByType.set(assetType, []);
	}
};
resetAssetsMap();

const ASSETS_PARSERS = {
	'.png': AssetType.IMAGE,
	'.jpg': AssetType.IMAGE,
	'.svg': AssetType.IMAGE,
	'.webp': AssetType.IMAGE,
	'.s.json': AssetType.SCENE,
	'.p.json': AssetType.PREFAB,
	'.l.json': AssetType.L10N,
	'.json': AssetType.RESOURCE,
	'.woff': AssetType.FONT,
	'.woff2': AssetType.FONT,
	'.wav': AssetType.SOUND,
	'.xml': AssetType.BITMAP_FONT,
	'.c.ts': AssetType.CLASS
};

const ASSET_TYPE_TO_EXT = {
	[AssetType.SCENE]: '.s.json',
	[AssetType.PREFAB]: '.p.json',
	[AssetType.CLASS]: '.c.ts'
};

const ASSET_EXT_CROP_LENGTHS: Map<AssetType, number> = new Map();
ASSET_EXT_CROP_LENGTHS.set(AssetType.FONT, 0);
ASSET_EXT_CROP_LENGTHS.set(AssetType.IMAGE, 0);
ASSET_EXT_CROP_LENGTHS.set(AssetType.SCENE, 7);
ASSET_EXT_CROP_LENGTHS.set(AssetType.PREFAB, 7);
ASSET_EXT_CROP_LENGTHS.set(AssetType.L10N, 7);
ASSET_EXT_CROP_LENGTHS.set(AssetType.SOUND, 4);
ASSET_EXT_CROP_LENGTHS.set(AssetType.CLASS, 5);
ASSET_EXT_CROP_LENGTHS.set(AssetType.RESOURCE, 5);
ASSET_EXT_CROP_LENGTHS.set(AssetType.BITMAP_FONT, 4);

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

const execFs = (command: string, filename?: string | string[] | number, content?: string | boolean, ...args: any[]) => {
	const ret = electron_ThingEditorServer.fs(command, filename, content, ...args);
	if (ret instanceof Error) {
		game.editor.ui.modal.showFatalError('Main process error.', 99999, ret.message);
		throw ret;
	}
	return ret;
};

const execFsAsync = (command: string, filename?: string | string[], content?: string | boolean, ...args: any[]): Promise<any> => {
	return electron_ThingEditorServer.fsAsync(command, filename, content, ...args);
};

let lastAssetsDirs: string[];

let fileChangeDebounceTimeout = 0;
const fileChangeHandler = () => {
	fileChangeDebounceTimeout = 0;
	fs.refreshAssetsList();
};

electron_ThingEditorServer.onServerMessage((_ev: any, event: string, path: string) => {
	if (!game.editor.isProjectOpen) {
		return;
	}
	if (event === 'fs/change') {
		path = '/' + path.replace(/\\/g, '/');
		if (!ignoreFiles.has(path)) {
			if (fileChangeDebounceTimeout) {
				clearTimeout(fileChangeDebounceTimeout);
			}
			if (path.endsWith('.ts')) {
				game.editor.classesUpdatedExternally();
			} else {
				fileChangeDebounceTimeout = window.setTimeout(fileChangeHandler, 330);
			}
		}
	} else if (event === 'fs/notify') {
		game.editor.ui.modal.notify(path);
	}
});

const ignoreFiles = new Set();
function ignoreWatch(fileName: string) {
	ignoreFiles.add(fileName);
	window.setTimeout(() => {
		ignoreFiles.delete(fileName);
	}, 500);
}

const assetNameToFileName = (assetName: string, assetType: AssetType, libName = game.editor.currentProjectAssetsDirRooted): string => {
	const asset = (assetsByTypeByName.get(assetType) as Map<string, FileDesc>).get(assetName);
	if (asset) {
		return asset.fileName;
	}
	return libName + assetName + (ASSET_TYPE_TO_EXT as KeyedObject)[assetType];
};

const sortByMTime = (a: FileDesc, b: FileDesc) => {
	return b.mTime - a.mTime;
};

const sortAssets = () => {
	assetsListsByType.forEach((list) => {
		list.sort(sortByMTime);
	});

	allAssets.sort(sortByMTime);
};

export default class fs {

	static getAssetsList(assetType?: AssetType.SOUND): FileDescSound[];
	static getAssetsList(assetType?: AssetType.IMAGE): FileDescImage[];
	static getAssetsList(assetType?: AssetType.CLASS): FileDescClass[];
	static getAssetsList(assetType?: AssetType.SCENE): FileDescScene[];
	static getAssetsList(assetType?: AssetType.PREFAB): FileDescPrefab[];
	static getAssetsList(assetType?: AssetType): FileDesc[];
	static getAssetsList(assetType: AssetType | null = null): FileDesc[] {
		if (assetType === null) {
			return allAssets;
		}
		return assetsListsByType.get(assetType) as FileDesc[];
	}

	/** retunrs FileDesc of scene or prefab of given container */
	static getFileOfRoot(object: Container): FileDescPrefab | FileDescScene {
		const root = object.getRootContainer() || game.currentContainer;
		const rootName = root.name as string;
		if (root instanceof Scene) {
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

	static removeSubAsset(assetName: string, type: AssetType) {
		const file = this.getFileByAssetName(assetName, type);
		if (file) {
			const list = (assetsListsByType.get(file.assetType) as FileDesc[]);
			list.splice(list.indexOf(file), 1);
			allAssets.splice(allAssets.indexOf(file), 1);
			assetsByTypeByName.get(file.assetType)!.delete(file.assetName);
		}
		if (prevAssetsByTypeByName) {
			const file = prevAssetsByTypeByName.get(type)!.get(assetName) as FileDesc;
			if (file) {
				prevAssetsByTypeByName.get(file.assetType as AssetType)!.delete(assetName);
			}
		}
	}

	static addSubAsset(file: FileDesc) {
		(assetsListsByType.get(file.assetType) as FileDesc[]).push(file);
		allAssets.push(file);
		(assetsByTypeByName.get(file.assetType as AssetType) as Map<string, FileDesc>).set(file.assetName, file);
	}

	/** returns new mTime */
	static writeFile(fileName: string, data: string | Blob | KeyedObject, separator:string | null = '	'): number {
		if (typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fs.fieldsFilter, separator as string);
		}
		return execFs('fs/saveFile', fileName, data as string) as number;
	}

	static exists(fileName: string) {
		return execFs('fs/exists', fileName);
	}

	static log(message: string) {
		return execFs('fs/log', message);
	}

	static copyFile(from: string, to: string) {
		return execFs('fs/copyFile', from, to);
	}

	static async run(script: string, ...args: any[]) {
		game.editor.ui.modal.showSpinner();
		const res = await execFsAsync('fs/run', script, undefined, args);

		game.editor.ui.modal.hideSpinner();
		if (res instanceof Error) {
			game.editor.ui.modal.showError(res.stack, undefined, 'Deploy error');
			return null;
		}
		return res;
	}

	static renameAsset(file: FileDesc) {
		let ext = '';
		if (file.assetType === AssetType.IMAGE) {
			ext = file.assetName.substring(file.assetName.lastIndexOf('.'));
		}
		game.editor.ui.modal.showPrompt('Rename asset ' + ext, file.assetName.substring(0, file.assetName.length - ext.length),
			(val) => { // filter
				return val.replace(prefabNameFilter, '-');
			},
			(val) => { //accept
				const newAssetName = val + ext;
				let newFile = fs.getFileByAssetName(newAssetName, file.assetType);
				if (file === newFile) {
					return;
				}
				if (newFile) {
					return 'Already exists';
				}
				if (val.endsWith('/') || val.startsWith('/')) {
					return 'name can not begin or end with "/"';
				}
			}).then((newName: string) => {
			if (newName) {
				newName += ext;
				if (newName !== file.assetName) {
					const i = file.fileName.lastIndexOf(file.assetName);
					fs.copyFile(file.fileName, file.fileName.substring(0, i) + newName + file.fileName.substring(i + file.assetName.length));
					fs.deleteFile(file.fileName);
				}
			}
		});
	}

	static copyAssetToProject(file: FileDesc) {
		if (file.assetType === AssetType.CLASS) {
			game.editor.ui.modal.showInfo('Class can not be copied to the project. Create a new class inherited from ' + (file as FileDescClass).asset.__className + ' instead.', 'Can not copy class.');
			return;
		}
		fs.copyFile(file.fileName, file.fileName.replace(file.lib!.assetsDir, game.editor.currentProjectAssetsDir));
		file.lib = null;
		game.editor.ui.refresh();
	}

	static moveAssetToFolder(file: FileDesc, lib: null | LibInfo) {
		fs.copyFile(file.fileName, file.fileName.replace(file.lib ? file.lib.assetsDir : game.editor.currentProjectAssetsDir, lib ? lib.assetsDir : game.editor.currentProjectAssetsDir));
		fs.deleteAsset(file.assetName, file.assetType);
		game.editor.ui.refresh();
	}

	static saveAsset(assetName: string, assetType: AssetType, data: string | Blob | KeyedObject, libName?: string, doNotSetFileAsset = false) {
		const fileName = assetNameToFileName(assetName, assetType, libName);
		ignoreWatch(fileName);
		const mTime = fs.writeFile(fileName, data);
		const file = fs.getFileByAssetName(assetName, assetType);
		if (file) {
			file.mTime = mTime;
			if (!doNotSetFileAsset) {
				file.asset = data as SerializedObject;
			}
			sortAssets();
			game.editor.ui.refresh();
		} else if (!assetName.startsWith(EDITOR_BACKUP_PREFIX)) {
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
		if (!assetName.startsWith(EDITOR_BACKUP_PREFIX)) {
			fs.refreshAssetsList();
		}
	}

	static parseJSON(src: string, fileName: string) {
		try {
			return JSON.parse(src);
		} catch (er: any) {
			game.editor.ui.modal.showFatalError('JSON parse error. ' + fileName + '; ' + er.message, 99999, 'Error in file: ' + fileName + '\n' + (er as Error).message);
		}
	}

	static readJSONFile(fileName: string): any {
		return this.parseJSON(fs.readFile(fileName), fileName);
	}

	static readJSONFileIfExists(fileName: string) {
		const src = this.readFileIfExists(fileName);
		return src && this.parseJSON(src, fileName);
	}

	static readFileIfExists(fileName: string) {
		return (execFs('fs/readFileIfExists', fileName) as any as string | null);
	}

	static readFile(fileName: string) {
		return (execFs('fs/readFile', fileName) as any as string);
	}

	static enumProjects(): ProjectDesc[] {
		return execFs('fs/enumProjects') as ProjectDesc[];
	}

	static browseDir(path: string) {
		return execFs('fs/browseDir', path);
	}

	static showFile(fileName: string) {
		return execFs('fs/showFile', fileName);
	}

	static build(projectDir: string, debug: boolean, copyAssets: { from: string; to: string }[], projectDesc:ProjectDesc) {
		return execFsAsync('fs/build', projectDir, debug, copyAssets, projectDesc);
	}

	static watchDirs(dirs: string[]) {
		execFs('fs/watchDirs', dirs);
	}

	static isFilesEqual(fileName1: string, fileName2: string): boolean {
		return execFs('fs/isFilesEqual', fileName1, fileName2) as boolean;
	}

	static rebuildSoundsIfNeed(file: FileDesc) {
		if (file.assetType === AssetType.SOUND) {
			scheduledSoundsRebuilds.add(file.lib ? file.lib.dir : game.editor.currentProjectAssetsDir);
		}
	}

	static setProgressBar(progress: number) {
		execFs('fs/setProgressBar', progress);
	}

	static rebuildSounds(dir: string): object {
		const options = {
			dir,
			formats: game.editor.projectDesc.soundFormats,
			bitRates: game.editor.projectDesc.soundBitRates,
			defaultBitrate: game.editor.projectDesc.soundDefaultBitrate
		};
		return execFs('fs/sounds-build', options as any) as any;
	}

	static getArgs(): string[] {
		return execFs('fs/get-args') as any;
	}

	static getFolderAssets(dirName: string): FileDesc[] {
		assert(dirName.endsWith('/'), 'dirName should end with slash "/". Got ' + dirName);

		const lib: LibInfo | null = game.editor.currentProjectLibs.find(l => l.assetsDir === dirName) || null;
		const files = execFs('fs/readDir', dirName, game.editor.projectDesc as any) as FileDesc[];
		return files.filter((file) => {
			const wrongSymbol = fs.getWrongSymbol(file.fileName);
			if (wrongSymbol) {
				game.editor.ui.status.warn('File ' + file.fileName + ' ignored because of wrong symbol \'' + wrongSymbol + '\' in it\'s name', 32044);
				return;
			}
			const assetName = file.assetName || file.fileName.substring(dirName.length);
			for (const ext in ASSETS_PARSERS) {
				if (assetName.endsWith(ext)) {
					const assetType = (ASSETS_PARSERS as KeyedObject)[ext];
					file.assetName = assetName.substring(0, assetName.length - (ASSET_EXT_CROP_LENGTHS.get(assetType) as number));
					if (assetType === AssetType.CLASS) {
						file.assetName = file.assetName.replace(/-/g, '');
					}
					file.fileName = '/' + file.fileName;
					if (!file.assetType) { // can be already set in assets-loader.cjs
						file.assetType = assetType;
					}
					file.lib = lib;
					return true;
				}
			}
		});
	}

	static refreshAssetsList(dirNames?: string[]) {

		if (dirNames) {
			assert(!lastAssetsDirs, 'dirNames already defined.');
			lastAssetsDirs = dirNames;
		} else {
			assert(lastAssetsDirs, 'dirNames is not defined.');
			dirNames = lastAssetsDirs;
		}

		prevAssetsByTypeByName = assetsByTypeByName;
		resetAssetsMap();
		allAssets = [];

		console.log('refresh assets list');

		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('EMPTY', EMPTY);
		(assetsByTypeByName.get(AssetType.IMAGE) as Map<string, FileDesc>).set('WHITE', WHITE);

		for (const dirName of dirNames!) {
			const files = fs.getFolderAssets(dirName);
			for (const file of files) {
				const map = assetsByTypeByName.get(file.assetType as AssetType) as Map<string, FileDesc>;
				if (file.assetType !== AssetType.CLASS && map.has(file.assetName)) {
					const existingFile = map.get(file.assetName)!;
					window.setTimeout(() => {
						if (fs.isFilesEqual(file.fileName, existingFile.fileName)) {
							game.editor.warnEqualFiles(file, existingFile);
						}
					}, 0);
				}
				map.set(file.assetName, file);
			}
		}

		for (const assetsMap of assetsByTypeByName.values()) {
			for (const file of assetsMap.values()) {
				(assetsListsByType.get(file.assetType) as FileDesc[]).push(file);
				allAssets.push(file);

				const oldAsset = prevAssetsByTypeByName.get(file.assetType)!.get(file.assetName);
				if (!oldAsset) {
					fs.rebuildSoundsIfNeed(file);
					__onAssetAdded(file);
				} else {
					file.asset = oldAsset.asset;
					if (oldAsset.mTime !== file.mTime) {
						file.v = (oldAsset.v || 0) + 1;
						fs.rebuildSoundsIfNeed(file);
						__onAssetUpdated(file);
					} else {
						file.v = oldAsset.v;
						file._hashedAssetName = oldAsset._hashedAssetName;
					}
				}
			}
		}

		prevAssetsByTypeByName.forEach((prevAllAssets) => {
			prevAllAssets.forEach((file) => {
				if (!file.assetName.startsWith(EDITOR_BACKUP_PREFIX) && !fs.getFileByAssetName(file.assetName, file.assetType)) {
					if (file.parentAsset) {
						const newParentAsset = this.getFileByAssetName(file.parentAsset.assetName, file.parentAsset.assetType);
						file.parentAsset = newParentAsset;
						this.addSubAsset(file);
					} else {
						fs.rebuildSoundsIfNeed(file);
						__onAssetDeleted(file);
					}
				}
			});
		});

		sortAssets();

		let dirsToRebuildSounds = scheduledSoundsRebuilds.values();
		let soundsData: Map<string, KeyedObject> = new Map();
		for (let dir of dirsToRebuildSounds) {
			soundsData.set(dir, fs.rebuildSounds(dir));
		}

		scheduledSoundsRebuilds.clear();

		const sounds = this.getAssetsList(AssetType.SOUND);
		for (const file of sounds) {
			const soundsDirData = soundsData.get(file.lib ? file.lib.dir : game.editor.currentProjectAssetsDir)!;
			if (soundsDirData) {
				const sndData = soundsDirData.soundInfo[file.fileName.substring(1)];
				if (sndData) {
					file.asset.preciseDuration = sndData.duration;
				}
			}
		}
		editorEvents.emit('assetsRefreshed');
	}

	static getFileHash(fileName: string): string {
		return execFs('fs/getFileHash', fileName) as any as string;
	}

	static getWrongSymbol(fileName: string) {
		const wrongSymbolPos = fileName.search(/[^@a-zA-Z_\-\.\d\/]/gm);
		if (wrongSymbolPos >= 0) {
			return fileName[wrongSymbolPos];
		}
	}

	static fieldsFilter = (key: string, value: any) => {
		if (!key.startsWith('___')) {
			return value;
		}
	};

	static exitWithResult(success: string | undefined, error?: string) {
		debugger; // stop before exit
		execFs('fs/exitWithResult', success, typeof error === 'string' ? error : JSON.stringify(error));
	}

	static showQuestion(title: string, message: string, yes: string, no: string, cancel?: string): number {
		return execFs('fs/showQuestion', title, message, yes, no, cancel) as number;
	}
}

const scheduledSoundsRebuilds: Set<string> = new Set();

export { AllAssetsTypes, AssetType };
export type { FileDesc, FileDescClass, FileDescImage, FileDescL10n, FileDescPrefab, FileDescScene, FileDescSound, LibInfo };

