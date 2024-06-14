import R from './preact-fabrics';

import game from '../engine/game';

import type { Component, ComponentChild } from 'preact';
import { h, render } from 'preact';
import type { FileDesc, FileDescClass, LibInfo } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import ProjectsList from 'thing-editor/src/editor/ui/choose-project';
import UI from 'thing-editor/src/editor/ui/ui';
import historyInstance from 'thing-editor/src/editor/utils/history';
import protectAccessToSceneNode from 'thing-editor/src/editor/utils/protect-access-to-node';
import type { SelectionData } from 'thing-editor/src/editor/utils/selection';
import Selection from 'thing-editor/src/editor/utils/selection';
import Lib from 'thing-editor/src/engine/lib';
import Settings from 'thing-editor/src/engine/utils/settings';
import ClassesLoader from './classes-loader';

import LanguageView from 'thing-editor/src/editor/ui/language-view';

import type { Point } from 'pixi.js';
import { Container, Texture } from 'pixi.js';

import AssetsView from 'thing-editor/src/editor/ui/assets-view/assets-view';
import type { ChooseListItem } from 'thing-editor/src/editor/ui/choose-list';
import LocalStoreView from 'thing-editor/src/editor/ui/local-store-view';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import 'thing-editor/src/editor/ui/sound-profiler';
import debouncedCall from 'thing-editor/src/editor/utils/debounced-call';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import EDITOR_FLAGS, { EDITOR_BACKUP_PREFIX } from 'thing-editor/src/editor/utils/flags';
import regenerateCurrentSceneMapTypings, { regeneratePrefabsTypings } from 'thing-editor/src/editor/utils/generate-editor-typings';
import { libIcon } from 'thing-editor/src/editor/utils/lib-info';
import mergeProjectDesc, { isProjectDescValueKeyedMap } from 'thing-editor/src/editor/utils/merge-project-desc';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import { __UnknownClass } from 'thing-editor/src/editor/utils/unknown-class';
import validateObjectDataRecursive from 'thing-editor/src/editor/utils/validate-serialized-data';
import waitForCondition from 'thing-editor/src/editor/utils/wait-for-condition';
import type HowlSound from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import BgMusic from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music.c';
import { __UnknownClassScene } from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';
import Pool from 'thing-editor/src/engine/utils/pool';
import Sound from 'thing-editor/src/engine/utils/sound';
import type WebFont from 'webfontloader';
import Build from './utils/build';

const LAST_SCENE_NAME = '__EDITOR_last_scene_name';

const parseLibName = (name: string): LibInfo => {
	let dir;
	if (name.startsWith('.')) {
		dir = new URL(name, window.location.origin + '/' + game.editor.currentProjectDir).pathname.substring(1);
	} else {
		dir = 'libs/' + name;
	}
	return {
		libNum: 0,
		name,
		dir,
		assetsDir: dir + '/assets/'
	};
};

import.meta.hot?.on('vite:beforeFullReload', (ev: any) => { //disable vite.hmr full reload
	ev.path = 'vite please, do not reload anything.html';
});

let previewedSound: HowlSound;

class Editor {

	LanguageView = LanguageView;
	LocalStoreView = LocalStoreView;

	currentProjectDir = '';
	currentProjectAssetsDir = '';
	currentProjectAssetsDirRooted = '';
	assetsFolders!: string[];
	libsDescriptors: KeyedMap<ProjectDesc> = {};

	editorArguments: KeyedMap<true | string> = {};
	projectDesc!: ProjectDesc;

	selection = new Selection();

	settings: Settings = new Settings('editor');
	settingsLocal!: Settings;

	showGizmo: boolean = this.settings.getItem('show-gizmo', true);

	isSafeAreaVisible = true;

	disableFieldsCache = false;

	history = historyInstance;

	_lastChangedFiledName: string | null = null;

	savedBackupName?: string | null;
	savedBackupSelectionData?: SelectionData;

	/** editor space mouse coord X */
	mouseX = 0;
	/** editor space mouse coord Y */
	mouseY = 0;

	ui!: UI;

	/** true when editor blocked fatally with un-closable error */
	__FatalError = false;

	restartInProgress = false;

	isProjectOpen = false;

	currentPathChoosingField?: EditablePropertyDesc;

	currentProjectLibs!: LibInfo[];

	get makeVisibleAll() { /// 99999
		return game.keys.altKey;
	}

	constructor() {
		const args = fs.getArgs();
		for (let arg of args) {
			if (arg.startsWith('--') && arg.indexOf('=') > 0) {
				const a = arg.split('=');
				this.editorArguments[a[0].substring(2)] = a[1];
			} else {
				this.editorArguments[arg] = true;
			}
		}

		this.onUIMounted = this.onUIMounted.bind(this);
		game.editor = this;

		if (this.buildProjectAndExit) {
			this.editorArguments['no-vscode-integration'] = true;
			window.addEventListener('error', (er) => {
				fs.log('unhandled error:');
				fs.exitWithResult(undefined, er.error.stack);
			});
			window.addEventListener('unhandledrejection', (er) => {
				fs.log('unhandled rejection:');
				fs.exitWithResult(undefined, er.reason);
			});

			setInterval(() => {
				if (document.querySelector('vite-error-overlay')) {
					fs.log('VITE OVERLAY:');
					fs.log(document.querySelector('vite-error-overlay')!.textContent!);
					fs.exitWithResult(undefined, 'vite-error-overlay show');
				}
			}, 1000);
			R.icon = (() => {}) as any;
			R.imageIcon = (() => {}) as any;
			R.img = (() => {}) as any;
			game.editor.settings.setItem('sound-muted', true);
		}

		this.setIsMobileAny(game.editor.settings.getItem('isMobile.any', false));

		game.__EDITOR_mode = true;
		render(h(UI, { onUIMounted: this.onUIMounted }), document.getElementById('root') as HTMLElement);

		this.__saveProjectDescriptorInner = this.__saveProjectDescriptorInner.bind(this);
		this.editProperty = this.editProperty.bind(this);
		this.reloadClasses = this.reloadClasses.bind(this);
	}

	onUIMounted(ui: UI) {
		this.ui = ui;
		// load built in components

		fs.log('buildProjectAndExit: ' + this.buildProjectAndExit);

		if (this.buildProjectAndExit) {
			this.settings.setItem('last-opened-project', this.buildProjectAndExit);
		}

		if (this.settings.getItem('last-opened-project')) {
			this.openProject(this.settings.getItem('last-opened-project'));
		} else {
			this.chooseProject(true);
		}

		window.onbeforeunload = (e) => {
			if (!this.restartInProgress && !this.__FatalError) {
				if (this.askSceneToSaveIfNeed() === false) {
					e.returnValue = false;
				}
			}
		};

		window.setInterval(() => { //keep props editor and tree actual during scene is launched
			if (EDITOR_FLAGS.updateInProgress) {
				EDITOR_FLAGS.updateInProgress = false;
				editor.ui.modal.showFatalError(R.fragment('Exception during update().', R.br(), R.btn('reload page', () => {
					location.reload();
				})), 99999);
			}
			if (!game.__EDITOR_mode && !game.__paused) {
				this.refreshTreeViewAndPropertyEditor();
			}
		}, 300);
	}

	get isCurrentSceneModified() {
		assert(game.__EDITOR_mode, 'access to isCurrentSceneModified in running mode.');
		return this.isCurrentContainerModified;
	}

	get isCurrentContainerModified() {
		return this.history.isStateModified;
	}

	async reloadClasses() {
		this.ui.modal.showSpinner();
		let restorePrefabName = PrefabEditor.currentPrefabName;
		let needRestoring = !restorePrefabName && game.__EDITOR_mode && game.editor.isCurrentContainerModified;
		if (needRestoring) {
			this.saveBackup();
		}
		this.ui.viewport.stopExecution();
		await ClassesLoader.reloadClasses();
		if (restorePrefabName) {
			PrefabEditor.editPrefab(restorePrefabName);
		}
		if (needRestoring) {
			this.restoreBackup();
		}
		editor.ui.refresh();
		this.ui.modal.hideSpinner();
	}


	onEditorRenderResize() {
		this.refreshTreeViewAndPropertyEditor();
		this.ui.viewport.forceUpdate();
	}

	saveBackup() {
		if (!this.isCurrentSceneModified) {
			return;
		}
		this.saveCurrentScene(this.currentSceneBackupName);
	}

	restoreBackup() {
		const backupName = this.currentSceneBackupName;
		if (Lib.hasScene(backupName)) {
			this.openScene(backupName);
			this.removeBackup();
			this.history.setCurrentStateModified();
		} else {
			this.openScene(this.currentSceneName);
		}
	}

	removeBackup() {
		if (Lib.hasScene(this.currentSceneBackupName)) {
			Lib.__deleteScene(this.currentSceneBackupName);
		}
	}

	editProperty(field: EditablePropertyDesc | string, val: any, delta?: boolean) {
		if (this.selection.length > 0) {

			if (typeof field === 'string') {
				field = this.getObjectField(this.selection[0], field);
			}

			assert(this.ui.propsEditor.editableProps[field.name], 'Property is disabled.');

			if (field.beforeEdited) {
				field.beforeEdited(val);
			}

			for (let o of this.selection) {
				this.onObjectsPropertyChanged(o, field, val, delta);
			}
			if (field.afterEdited) {
				field.afterEdited();
			}
		}
	}

	getObjectField(o: Container, name: string): EditablePropertyDesc {
		const ret = (o.constructor as SourceMappedConstructor).__editableProps.find((f) => {
			return f.name === name;
		}) as EditablePropertyDesc;
		assert(ret, 'Unknown editable propery name: ' + name);
		return ret;
	}

	chooseProject(notSkipable = false) {
		ProjectsList.__chooseProject(notSkipable).then((dir: string) => {
			if (dir) {
				if (this.askSceneToSaveIfNeed()) {
					this.settings.setItem('last-opened-project', dir);
					this.restartInProgress = true;
					window.document.location.reload();
				}
			}
		});
	}

	pauseGame() {
		if (!game.__paused && !game.__EDITOR_mode) {
			game.__paused = true;
			this.ui.viewport.refresh();
		}
	}

	get buildProjectAndExit(): string | undefined {
		return this.editorArguments['build-and-exit'] as string;
	}

	async openProject(dir?: string) {
		this.ui.viewport.stopExecution();

		if (!dir) {
			this.chooseProject(true);
			return;
		}
		const newProjectDir = 'games/' + dir + '/';

		if (newProjectDir !== this.currentProjectDir) {
			this.currentProjectDir = newProjectDir;
			this.currentProjectAssetsDir = this.currentProjectDir + 'assets/';
			this.currentProjectAssetsDirRooted = '/' + this.currentProjectAssetsDir;

			this.ui.modal.showSpinner();
			this.settings.removeItem('last-opened-project');

			const projectDesc = fs.readJSONFile(this.currentProjectDir + 'thing-project.json') as ProjectDesc;

			if (!projectDesc) {
				this.ui.modal.showError('Can\'t open project ' + dir).then(() => { this.chooseProject(true); });
				return;
			}
			projectDesc.dir = this.currentProjectDir;
			if (!projectDesc.libs) {
				projectDesc.libs = [];
			}

			this.settingsLocal = new Settings('__EDITOR_project_' + projectDesc.id);

			const libsProjectDescMerged = {} as ProjectDesc;

			this.currentProjectLibs = projectDesc.libs.map(parseLibName);
			this.currentProjectLibs.unshift({
				name: 'thing-editor-embed',
				libNum: 0,
				dir: 'thing-editor/src/engine/lib',
				assetsDir: 'thing-editor/src/engine/lib/assets/',
				isEmbed: true
			});
			this.assetsFolders = [];

			const schemas: any[] = [];

			let libNum = 0;
			for (let lib of this.currentProjectLibs) {
				lib.libNum = libNum++;
				this.assetsFolders.push(lib.assetsDir);
				const libFileName = lib.dir + '/thing-lib.json';
				try {
					this.libsDescriptors[lib.name] = fs.readJSONFile(libFileName);
				} catch (er: any) {
					editor.ui.modal.showFatalError('Library loading error. Is "libs" option in "thing-projects.json" correct?', 99999, er.message);
					return;
				}
				mergeProjectDesc(libsProjectDescMerged, this.libsDescriptors[lib.name]);
				const libSchema = fs.readJSONFileIfExists(lib.dir + '/schema-thing-project.json');
				if (libSchema) {
					schemas.push(libSchema);
				}
			}

			const libSchema = fs.readJSONFileIfExists(this.currentProjectDir + '/schema-thing-project.json');
			if (libSchema) {
				schemas.push(libSchema);
			}

			const mergedSchema = schemas[0];
			for (const schema of schemas) {
				if (schema !== mergedSchema) {
					Object.assign(mergedSchema.properties, schema.properties);
				}
			}
			fs.writeFile('thing-editor/src/editor/schema-thing-project.json', mergedSchema);

			this.assetsFolders.push(this.currentProjectAssetsDir);

			this.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());

			this.projectDesc = {} as ProjectDesc;
			mergeProjectDesc(this.projectDesc, libsProjectDescMerged);
			mergeProjectDesc(this.projectDesc, projectDesc);

			setTimeout(excludeOtherProjects, 1);

			game.applyProjectDesc(this.projectDesc);

			editorEvents.emit('gameWillBeInitialized');

			game.init(window.document.getElementById('viewport-root') || undefined, 'editor.' + this.projectDesc.id);

			game.stage.interactiveChildren = false;
			protectAccessToSceneNode(game.stage, 'game stage');
			protectAccessToSceneNode(game.stage.parent, 'PIXI stage');

			await Texture.fromURL('/thing-editor/img/wrong-texture.png').then((t) => {
				Lib.REMOVED_TEXTURE = t;
				return Promise.all([this.reloadAssetsAndClasses(true)]);
			});

			if (this.settingsLocal.getItem(LAST_SCENE_NAME) && !Lib.hasScene(this.settingsLocal.getItem(LAST_SCENE_NAME))) {
				this.saveLastSceneOpenName('');
			}
			this.settingsLocal.setItem(LAST_SCENE_NAME, this.settingsLocal.getItem(LAST_SCENE_NAME) || this.projectDesc.mainScene || 'main');
			editorEvents.emit('firstSceneWillOpen');
			this.restoreBackup();

			regeneratePrefabsTypings();
			if (!this.buildProjectAndExit) {
				fs.watchDirs(this.assetsFolders.slice(1)); //slice - exclude watching embed library.
			}
			this.ui.modal.hideSpinner();
			this.isProjectOpen = true;

			game.onResize();

			this.settings.setItem('last-opened-project', dir);

			this.validateResources();

			editorEvents.emit('projectDidOpen');
			game.editor.saveProjectDesc();
			this.setIsMobileAny(game.editor.settings.getItem('isMobile.any', false));
			this.isSafeAreaVisible = game.editor.settings.getItem('safe-area-frame', true) && game.projectDesc.dynamicStageSize;

			if (this.buildProjectAndExit) {
				await Build.build(false);
				await Build.build(true);
				fs.exitWithResult('build finished');
			}

		}
	}

	toggleScreenOrientation() {
		game.__enforcedOrientation = (game.__enforcedOrientation === 'portrait') ? 'landscape' : 'portrait';
		game.onResize();
	}

	toggleIsMobileAny() {
		this.setIsMobileAny(!game.isMobile.any);
	}

	setIsMobileAny(val: boolean) {
		if (val !== game.isMobile.any) {
			const isMobileAny = game.___enforcedOrientation === 'portrait' || val;
			if (isMobileAny != game.isMobile.any) {
				game.isMobile.any = isMobileAny;
				game.editor.settings.setItem('isMobile.any', val);
				this._processIsMobileHandlers();
			} else {
				if (game.editor.ui) {
					game.editor.ui.modal.notify('Can not change "isMobile" in portrait mode.');
				}
			}
		}
	}

	_processIsMobileHandlers() {
		if (game.stage) {
			game.forAllChildrenEverywhere((o: any) => {
				if (o.__onIsMobileChange) {
					o.__onIsMobileChange();
				}
			});
			this.ui.propsEditor.refresh();
		}
	}

	toggleSafeAreaFrame() {
		game.editor.settings.setItem('safe-area-frame', !game.editor.settings.getItem('safe-area-frame', true));
		this.isSafeAreaVisible = game.editor.settings.getItem('safe-area-frame') && game.projectDesc.dynamicStageSize;
	}

	toggleHideHelpers() {
		game.editor.settings.setItem('show-gizmo', !game.editor.settings.getItem('show-gizmo', true));
		this.showGizmo = game.editor.settings.getItem('show-gizmo');
	}

	get isGizmoVisible() {
		return this.showGizmo && !document.fullscreenElement;
	}

	toggleSoundMute() {
		game.editor.settings.setItem('sound-muted', !game.editor.settings.getItem('sound-muted'));
		Sound.__resetSounds();
		BgMusic._recalculateMusic();
	}

	toggleVSCodeExcluding() {
		game.editor.settings.setItem('vs-code-excluding', !game.editor.settings.getItem('vs-code-excluding'));
		excludeOtherProjects(true);
		fs.run('/thing-editor/electron-main/assume-unchanged.js', game.editor.settings.getItem('vs-code-excluding'));
	}

	toggleShowSystemAssets() {
		game.editor.settings.setItem('show-system-assets', !game.editor.settings.getItem('show-system-assets'));
		this.ui.refresh();
	}

	scrollAssetInToView(assetName: string) {
		AssetsView.scrollAssetInToView(assetName);
	}

	warnEqualFiles(file: FileDesc, existingFile: FileDesc) {
		this.ui.status.warn('File overlaps the same file in library. ' + file.fileName + ' => ' + existingFile.fileName, 99999, (ev?: PointerEvent) => {
			let preview = AssetsView.renderAssetItem(file);
			if (ev && ev.ctrlKey) {
				fs.deleteAsset(file.assetName, file.assetType);
				game.editor.ui.status.clearLastClickedItem();
			}
			editor.ui.modal.showEditorQuestion('A you sure you want to remove duplicate file?', preview, () => {
				fs.deleteAsset(file.assetName, file.assetType);
				game.editor.ui.status.clearLastClickedItem();
			}, R.span({ className: 'danger' }, R.img({ src: 'img/delete.png' }), 'Delete duplicate file'));
		});
	}

	saveProjectDesc() {
		debouncedCall(this.__saveProjectDescriptorInner);
	}

	openScene(name: string) {
		if (this.askSceneToSaveIfNeed()) {

			Pool.__resetIdCounter();

			assert(name, 'name should be defined');

			game.showScene(name);

			game.currentContainer.__nodeExtendData.childrenExpanded = true;


			document.title = '(' + this.projectDesc.title + ') - - (' + game.currentScene.name + ')';
			this.saveLastSceneOpenName(game.currentScene.name as string);
			if (game.currentScene) {
				this.selection.loadCurrentSelection();
			}
			this.history.setCurrentStateUnmodified();
			this.ui.refresh();
			regenerateCurrentSceneMapTypings();
		}
	}

	classesUpdatedExternally() {
		ClassesLoader.isClassesWaitsReloading = true;
		this.ui.viewport.refresh();
	}

	/** if returns false - cancel operation */
	askSceneToSaveIfNeed(): boolean {
		this.ui.viewport.stopExecution();
		if (PrefabEditor.acceptPrefabEdition() === false) {
			return false;
		}
		if (this.isCurrentSceneModified) {
			let ansver = fs.showQuestion(
				'Unsaved changes.',
				'Do you want to save changes in \'' + this.currentSceneName + '\' scene?',
				'Save',
				'Discard',
				'Cancel'
			);
			if (ansver === 0) {
				this.saveCurrentScene();
			} else if (ansver === 2) {
				return false;
			}
		} else {
			if (game.currentScene) {
				this.selection.saveCurrentSelection();
			}
		}
		return true;
	}

	addTo(parent: Container, child: Container) {
		parent.addChild(child);
		let p = parent;
		while (p) {
			p.__hideChildren = false;
			p = p.parent;
		}
		Lib.__callInitIfGameRuns(child);
		this.selection.select(child, true);
		Lib.__invalidateSerializationCache(child);
		this.sceneModified();
	}

	isCanBeAddedAsChild(Class: SourceMappedConstructor, parent?: Container): boolean {
		const parents = parent ? [parent] : this.selection;
		if (parents.length < 1) {
			return false;
		}
		for (let o of parents) {

			if (Class.__canAcceptParent) {
				if (!Class.__canAcceptParent(o)) {
					return false;
				}
			}

			if ((o.constructor as SourceMappedConstructor).__canAcceptChild) {
				if (!(o.constructor as SourceMappedConstructor).__canAcceptChild!(Class)) {
					return false;
				}
			}
		}
		return true;
	}

	_getProjectViewportSize(forceLandscape = true) {
		if (game.projectDesc.screenOrientation === 'auto') {
			if (forceLandscape) {
				game.___enforcedOrientation = 'landscape';
			}
			if (forceLandscape || !game.isPortrait) {
				return {
					w: game.projectDesc.width,
					h: game.projectDesc.height
				};
			} else {
				return {
					w: game.projectDesc.portraitWidth,
					h: game.projectDesc.portraitHeight
				};
			}
		} else if (game.projectDesc.screenOrientation === 'portrait') {
			return {
				w: game.projectDesc.portraitWidth,
				h: game.projectDesc.portraitHeight
			};
		} else {
			return {
				w: game.projectDesc.width,
				h: game.projectDesc.height
			};
		}
	}

	_callInPortraitMode(callback: () => void) {
		let tmpOrientation = game.___enforcedOrientation;
		let tmpIsMobile = game.isMobile.any;
		game.isMobile.any = false;
		let size = this._getProjectViewportSize();
		game.__enforcedW = size.w;
		game.__enforcedH = size.h;

		game.onResize();
		callback();
		game.___enforcedOrientation = tmpOrientation;
		delete game.__enforcedW;
		delete game.__enforcedH;
		game.isMobile.any = tmpIsMobile;
		game.onResize();
	}

	validateResources() {
		for (let data of [Lib.prefabs, Lib.scenes]) {
			for (let name in data) {
				let objectData = data[name];
				validateObjectDataRecursive(objectData, name);
			}
		}
	}

	saveCurrentScene(name: string = this.currentSceneName) {

		this.ui.viewport.stopExecution();

		assert(name, 'Name can\'t be empty');
		assert(game.__EDITOR_mode, 'tried to save scene in running mode.');
		if (this.isCurrentSceneModified || (this.currentSceneName !== name)) {

			this.history.setCurrentStateUnmodified();
			this.saveLastSceneOpenName(name);
			this._callInPortraitMode(() => {
				Lib.__saveScene(game.currentScene, name);
				this.selection.saveCurrentSelection();
			});
		}
		this.validateResources();
	}

	get currentSceneName(): string {
		return this.settingsLocal.getItem(LAST_SCENE_NAME, '');
	}

	get currentSceneBackupName() {
		return EDITOR_BACKUP_PREFIX + this.settingsLocal.getItem(LAST_SCENE_NAME);
	}

	openUrl(url: string) {
		window.open(url);
	}

	sceneModified(saveImmediately = false) {
		this.history._sceneModifiedInner(saveImmediately);
	}

	moveContainerWithoutChildren(o: Container, dX: number, dY: number) {
		for (let c of o.children) {
			let p = c.getGlobalPosition();
			c.__nodeExtendData.tmpGlobalPos = p;
			let p2 = o.toLocal(p);
			if (isNaN(p2.x) || isNaN(p2.y)) {
				this.ui.status.warn('Object has zero scale and can not be moved without affecting children`s positions.', 30023, o);
				return;
			}
		}
		this.shiftObject(o, dX, dY);
		for (let c of o.children) {
			let p = o.toLocal(c.__nodeExtendData.tmpGlobalPos as Point);
			this.shiftObject(c as Container, Math.round(p.x - c.x), Math.round(p.y - c.y));
		}
	}

	shiftObject(o: Container, dX: number, dY: number) {
		if (dX !== 0 || dY !== 0) {
			// Shift wrapped object to zero. If it is MovieClip its will shift all timeline.

			if (o.__shiftObject) {
				o.__shiftObject(dX, dY);
			} else {

				Timeline.disableRecording();
				if (dX !== 0) {
					this.onObjectsPropertyChanged(o, 'x', dX, true);
				}
				if (dY !== 0) {
					this.onObjectsPropertyChanged(o, 'y', dY, true);
				}
				Timeline.enableRecording();
			}
		}
	}

	previewSound(soundName: string) {

		if (Lib.getSound(soundName).playing()) {
			Lib.getSound(soundName).stop();
		} else {
			if (previewedSound && previewedSound.playing()) {
				previewedSound.stop();
			}
			Sound.play(soundName);
			previewedSound = Lib.getSound(soundName);
		}
	}

	blurPropsInputs() {
		if (document.activeElement && (document.activeElement.classList.contains('number-input'))) {
			(document.activeElement as HTMLElement).blur();
		}
	}

	async chooseImage(title: ComponentChild = 'Choose image', activeImage?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.IMAGE, title, activeImage);
	}

	async chooseSound(title: ComponentChild = 'Choose sound', activeSound?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.SOUND, title, activeSound, this.previewSound);
	}

	async choosePrefab(title: ComponentChild = 'Choose prefab', currentPrefab?: string, filterCallback?: (f: FileDesc) => boolean): Promise<string | null> {
		return this.chooseAsset(AssetType.PREFAB, title, currentPrefab, undefined, filterCallback);
	}

	async chooseScene(title: ComponentChild = 'Choose scenbe', currentScene?: string, filterCallback?: (f: FileDesc) => boolean): Promise<string | null> {
		return this.chooseAsset(AssetType.SCENE, title, currentScene, undefined, filterCallback);
	}

	async chooseClass(isScene: boolean, id: string, title: ComponentChild = 'Choose class', currentClass?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.CLASS, title, currentClass, undefined, (file: FileDesc) => {
			return (file as FileDescClass).asset.__isScene === isScene;
		}, id);
	}

	validateCallbackParameter(txt: string) {
		if (txt.indexOf(',') >= 0) {
			return 'Parameter can not contain commas. Use your own javascript function instead.';
		}
	}

	async chooseAsset(type: AssetType, title: ComponentChild, currentValue?: string, onItemPreview?: (assetName: string) => void, filterCallback?: (f: FileDesc) => boolean, idSuffix = ''): Promise<string | null> {
		const id = type + '_choose_asset_list_popup' + idSuffix;
		const chosen: string = await this.ui.modal.showModal(h(AssetsView, {
			onItemSelect: (assetName: string) => {
				this.ui.modal.hideModal(assetName);
			},
			id,
			content: undefined,
			helpId: 'ChooseId',
			x: 0,
			minW: 400,
			minH: 200,
			y: 0,
			w: 50,
			h: 50,
			key: id,
			title,
			currentValue,
			onItemPreview,
			hideMenu: true,
			filter: { [type]: true },
			filterCallback
		}));
		if (chosen) {
			return chosen;
		}
		return null;
	}

	/** @deprecated use 'editorEvents.on' global object instead.*/
	on() {
		assert(false, 'use \'editorEvents.on\' global object instead');
	}

	/** @deprecated use 'editorEvents.on' global object instead.*/
	addEventListener() {
		assert(false, 'use \'editorEvents.on\' global object instead');
	}

	async reloadAssetsAndClasses(refresh = false) {
		if (refresh) {
			fs.refreshAssetsList(this.assetsFolders);
		}

		await this.reloadClasses();

		await waitForCondition(() => {
			return game.loadingProgress === 100;
		});
	}

	onObjectsPropertyChanged(o: Container, field: EditablePropertyDesc | string, val: any, isDelta?: boolean) {
		assert((!isDelta) || (typeof isDelta === 'boolean'), 'isDelta expected to be bool');
		let changed = false;
		if (typeof field === 'string') {
			field = this.getObjectField(o, field);
		}

		editorEvents.emit('beforePropertyChanged', o, field.name, field, val, isDelta);

		if (isDelta) {
			if (val === 0) {
				return;
			}
			assert(field.type === 'number', 'editable field descriptor type: Number expected');

			let v = (o as KeyedObject)[field.name];
			let newVal = v + val;
			if (field.hasOwnProperty('min')) {
				newVal = Math.max(field.min as number, newVal);
			}
			if (field.hasOwnProperty('max')) {
				newVal = Math.min(field.max as number, newVal);
			}
			if (v !== newVal) {
				(o as KeyedObject)[field.name] = newVal;
				changed = true;
			}
		} else {
			if ((o as KeyedObject)[field.name] !== val) {
				(o as KeyedObject)[field.name] = val;
				changed = true;
			}
		}

		editorEvents.emit('afterPropertyChanged', o, field.name, field, val, isDelta);

		if (changed) {
			Lib.__invalidateSerializationCache(o);
			this.refreshTreeViewAndPropertyEditor();
			this._lastChangedFiledName = field.name;
			this.sceneModified(false);
		}
		return changed;
	}

	showError(message: ComponentChild, errorCode = 99999) {
		this.ui.modal.showError(message, errorCode);
	}

	notify(message: string | Component) {
		this.ui.modal.notify(message);
	}

	refreshTreeViewAndPropertyEditor(onTreeViewUpdated?:() => void) {
		this.ui.sceneTree.refresh(onTreeViewUpdated);
		this.refreshPropsEditor();
	}

	refreshPropsEditor() {
		this.ui.propsEditor.refresh();
	}

	getFieldNameByValue(node: Container, fieldValue: any) {
		if (node instanceof Container) {
			const props = (node.constructor as SourceMappedConstructor).__editableProps;
			for (let p of props) {
				if ((node as KeyedObject)[p.name] === fieldValue) {
					return p.name;
				}
			}
		}
	}

	copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			this.notify(R.span(null, R.icon('copy'), '"' + text + '"'));
		});
	}

	editSource(fileName: string, line?: string, char?: string, absolutePath = false) {
		if (this.editorArguments['no-vscode-integration']) {
			return;
		}
		if (line !== undefined) {
			fileName += ':' + line;
			if (char !== undefined) {
				fileName += ':' + char;
			}
		}
		if (!absolutePath) {
			let rootPath: string = fs.getArgs()[0].split('node_modules')[0];
			if (fileName.startsWith('\\') || fileName.startsWith('/')) {
				rootPath = rootPath.substring(0, rootPath.length - 1);
			}
			this.editFile(rootPath + fileName);
		} else {
			this.editFile(fileName);
		}

	}

	editFile(fileName: string, findText?: string) {
		if (findText) {
			let src = fs.readFile(fileName);
			let a = src.split('\n');
			let char = 0;
			let lineNum = a.findIndex((l) => {
				char = l.indexOf(findText);
				return char >= 0;
			}) + 1;
			fileName += ':' + lineNum + ':' + char;
		}
		let url = '/__open-in-editor?file=' + encodeURIComponent(fileName);
		fetch(url);
	}

	editClassSource(c: SourceMappedConstructor | Container, className = '') {
		if (c instanceof Container) {
			c = c.constructor as SourceMappedConstructor;
		}
		if (!c || (c as any) === __UnknownClass || (c as any) === __UnknownClassScene) {
			this.ui.modal.showError('Object has unknown type \'' + className + '\', and has no source code. Probably source code was removed.');
			return;
		}

		this.editSource(c.__sourceFileName as string);
	}

	async moveAssetToLibrary(title: string, file: FileDesc) {
		let chosenFolder: string | undefined = await this.chooseAssetsFolder(title, file.lib ? file.lib.assetsDir : game.editor.currentProjectAssetsDir);
		if (!chosenFolder) {
			return;
		}
		fs.moveAssetToFolder(file, game.editor.currentProjectLibs.find(l => l.assetsDir === chosenFolder)!);
	}

	getUserVisibleFolders() {
		return game.editor.assetsFolders.filter(i => (!i.startsWith('thing-editor') || game.editor.settings.getItem('show-system-assets')));
	}


	async chooseAssetsFolder(title: string, activeFolderName?: string): Promise<string | undefined> {
		const dirs = this.getUserVisibleFolders();
		if (dirs.length === 1) {
			return dirs[0];
		} else {
			let folders: ChooseListItem[] = dirs.map((folder: string): ChooseListItem => {
				const libInfo = this.currentProjectLibs.find(l => l.assetsDir === folder);
				return {
					pureName: folder,
					name: R.fragment(libInfo ? libIcon(libInfo) : R.space(), folder.replace(/\/assets\/$/g, '').replace(/^libs\//g, ''))
				};
			});
			folders.reverse();
			folders[0].name = R.b(null, R.space(), 'project');
			const chosenItem = (folders.length === 1) ? folders[0] : await game.editor.ui.modal.showListChoose(title, folders, false, true, activeFolderName, true);
			if (chosenItem) {
				return chosenItem.pureName || chosenItem.name;
			}
		}
	}

	protected saveLastSceneOpenName(name: string) {
		if (!name.startsWith(EDITOR_BACKUP_PREFIX)) {
			this.settingsLocal.setItem(LAST_SCENE_NAME, name);
		}
	}

	protected __saveProjectDescriptorInner() {

		const descriptorsStack = this.currentProjectLibs.map((lib) => {
			return {
				fileName: lib.dir + '/thing-lib.json',
				desc: this.libsDescriptors[lib.name]
			};
		});
		descriptorsStack.push({
			fileName: this.currentProjectDir + 'thing-project.json',
			desc: this.projectDesc
		});

		while (descriptorsStack.length) {

			const descData = descriptorsStack.pop()!;

			let descToSave = JSON.parse(JSON.stringify(descData?.desc)) as KeyedObject;

			const libsProjectDescMerged = {} as ProjectDesc;
			descriptorsStack.forEach((desc) => {
				mergeProjectDesc(libsProjectDescMerged, desc.desc);
			});

			for (let key in libsProjectDescMerged) {
				if (descToSave.hasOwnProperty(key)) {

					let projectValue = descToSave[key];
					let libsValue = (libsProjectDescMerged as KeyedObject)[key];
					if (JSON.stringify(projectValue) === JSON.stringify(libsValue)) {
						delete descToSave[key];
					} else if (isProjectDescValueKeyedMap(key)) {
						for (let key in libsValue) {
							if (projectValue[key] === libsValue[key]) {
								delete projectValue[key];
							}
						}
						const assetNames = Object.keys(projectValue);
						for (const assetName of assetNames) {
							if (key === 'soundBitRates') {
								if (projectValue[assetName] === this.projectDesc.soundDefaultBitrate || !Lib.hasSound(assetName)) {
									delete projectValue[assetName];
								}
							} else if (key === 'loadOnDemandTextures') {
								if (!Lib.hasTexture(assetName)) {
									delete projectValue[assetName];
								}
							} else if (key === 'loadOnDemandSounds') {
								if (!Lib.hasSound(assetName)) {
									delete projectValue[assetName];
								}
							}
						}

					} else if (key === 'webfontloader') {
						for (const groupName in libsValue as WebFont.Config) {
							const group = libsValue[groupName] as WebFont.Google;
							if (group && group.families) {
								const projectFontGroup = (projectValue[groupName] as WebFont.Google).families;
								for (const family of group.families) {
									const stringedValue = JSON.stringify(family);
									const i = projectFontGroup.findIndex(f => JSON.stringify(f) === stringedValue);
									if (i >= 0) {
										projectFontGroup.splice(i, 1);
									}
								}
								if (projectFontGroup.length === 0) {
									delete projectValue[groupName];
								}
							}
						}
					}
				}
			}
			delete descToSave.dir;
			if (!descData.fileName.startsWith('thing-editor/')) {
				fs.writeFile(descData.fileName, descToSave);
			}
		}
	}
}

const WORKSPACE_FILE_NAME = 'thing-editor.code-workspace';
const TS_CONFIG_FILE_NAME = 'tsconfig.json';

function sanitizeJSON(input: string) {
	return input.replace(/\/\/.*$/gm, '').replace(/\/\*.*\*\//gm, '');
}


function excludeOtherProjects(forced = false) {

	const isExcludingEnabled = game.editor.settings.getItem('vs-code-excluding');

	if (!forced && !isExcludingEnabled) {
		return;
	}

	try { // vscode workspace

		const workspaceConfigSrc = fs.readFile(WORKSPACE_FILE_NAME);
		const foldersDataRegExt = /"folders"\s*:\s*\[[^\]]*\]/gm;
		let foldersData = foldersDataRegExt.exec(workspaceConfigSrc);

		const foldersDataString = sanitizeJSON(foldersData!.pop()!);
		const workspaceConfig = JSON.parse('{' + foldersDataString + '}');
		const folders = (workspaceConfig.folders as { path: string; name: string }[]).filter((folderData) => {
			return !folderData.path.startsWith('./games/') && !folderData.path.startsWith('./libs/');
		});

		if (isExcludingEnabled) {
			folders.push({
				path: './' + editor.currentProjectDir,
				name: editor.currentProjectDir
			});
			for (let lib of editor.currentProjectLibs) {
				if (!lib.isEmbed && !folders.find(f => f.name === lib.dir)) {
					folders.push({
						path: './' + lib.dir,
						name: lib.dir
					});
				}
			}
		} else {
			folders.push({
				path: './games/',
				name: 'games'
			});
			folders.push({
				path: './libs/',
				name: 'libs'
			});
		}

		folders.sort();
		let newFoldersSrc = JSON.stringify({ folders }, undefined, '\t');
		newFoldersSrc = newFoldersSrc.substring(3, newFoldersSrc.length - 2);
		if (newFoldersSrc !== foldersDataString) {
			fs.writeFile(WORKSPACE_FILE_NAME, workspaceConfigSrc.replace(foldersDataRegExt, newFoldersSrc));
		}
	} catch (er) {
		debugger;
		console.error('JSON parsing error: ' + WORKSPACE_FILE_NAME);
		console.error(er);
	}

	try { // tsconfig

		const workspaceConfigSrc = fs.readFile(TS_CONFIG_FILE_NAME);
		const foldersDataRegExt = /"include"\s*:\s*\[[^\]]*\]/gm;
		let foldersData = foldersDataRegExt.exec(workspaceConfigSrc);

		const foldersDataString = sanitizeJSON(foldersData!.pop()!);
		const tsConfig = JSON.parse('{' + foldersDataString + '}');
		const include = (tsConfig.include as string[]).filter((folder) => {
			return !folder.startsWith('./games/') && !folder.startsWith('./libs/');
		});

		if (isExcludingEnabled) {
			include.push('./' + editor.currentProjectDir);
			for (let lib of editor.currentProjectLibs) {
				const pathToAdd = './' + lib.dir;
				if (!lib.isEmbed && !include.includes(pathToAdd)) {
					include.push(pathToAdd);
				}
			}
		} else {
			include.push('./games/');
			include.push('./libs/');
		}

		include.sort();
		let newFoldersSrc = JSON.stringify({ include });
		newFoldersSrc = newFoldersSrc.substring(1, newFoldersSrc.length - 1);
		if (newFoldersSrc !== foldersDataString) {
			fs.writeFile(TS_CONFIG_FILE_NAME, workspaceConfigSrc.replace(foldersDataRegExt, newFoldersSrc));
		}
	} catch (er) {
		debugger;
		console.error('JSON parsing error: ' + TS_CONFIG_FILE_NAME);
		console.error(er);
	}
}

const editor = new Editor();

type __EditorType = typeof editor;

export type { __EditorType }; // hide Editor from intellisense

