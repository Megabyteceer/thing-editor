import { Text } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';
import type { FileDescL10n } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import Window from 'thing-editor/src/editor/ui/editor-window';
import group from 'thing-editor/src/editor/ui/group';
import type { SelectEditorItem } from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import scrollInToViewAndShake from 'thing-editor/src/editor/utils/scroll-in-view';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';
import L from 'thing-editor/src/engine/utils/l';

/** dir_name >> language >> FileDescL10n */
const assetsFiles: Map<string, Map<string, FileDescL10n>> = new Map();

type L10NData = KeyedMap<string>;

let currentLanguageData: L10NData;

const assetsDirs: string[] = [];

let langsIdsList: string[] = [];
let currentDirAssets: Map<string, FileDescL10n>;
let currentDir: string;
let languages: KeyedMap<L10NData> = {};

let currentIdsList: string[] = [];

let instance: LanguageView | null;

let assetsFilesIsDirty = false;

let ignoreEdit = false;

const priority = (file:FileDescL10n) => {
	let ret = file.lang.charCodeAt(0);
	if (file.lang === game.projectDesc.defaultLanguage) {
		ret += 1000;
	}
	return ret;
};
const sortLanguages = (a:FileDescL10n, b:FileDescL10n) => {
	return priority(b) - priority(a);
};

export default class LanguageView extends ComponentDebounced<ClassAttributes<LanguageView>> {

	componentDidMount(): void {
		instance = this;
	}

	componentWillUnmount(): void {
		instance = null;
	}

	render(): ComponentChild {
		return R.fragment(
			R.btn('×', LanguageView.toggle, 'Hide Text Editor', 'close-window-btn', {key: 'Escape'}),
			h(LanguageTableEditor, null));
	}

	static selectableList: SelectEditorItem[] = [];

	static addAssets() {
		if (!initialized) {
			init();
		}
		assetsFilesIsDirty = true;
	}

	static removeAsset() {
		assetsFilesIsDirty = true;
	}

	static toggle() {
		if (!instance) {
			showAdditionalWindow('language-view', 'language-view', 'Localization', h(LanguageView, null), 40, 0, 100, 70, 600, 300);
			Window.bringWindowForward('#language-view');
		} else {
			hideAdditionalWindow('language-view');
		}
	}

	static editKey(key: string | null, langId: string = L.getCurrentLanguageId()) {
		if (!ignoreEdit) {
			ignoreEdit = true;
			window.setTimeout(() => {
				ignoreEdit = false;
			}, 10);
			showTextTable().then(() => {
				if (key) {
					view!.createKeyOrEdit(key, langId);
				} else {
					view!.onAddNewKeyClick();
				}
			});
		}
	}

	static __validateTextData() {
		currentDirAssets.forEach((langData, langId) => {

			let templatesExample;
			for (let textId in langData) {
				let text = langData.asset[textId];
				if (text) {

					let a: string[] = [];
					text.replace(/%\w/gm, ((m: string) => {
						a.push(m);
					}) as any);

					a.sort((a, b) => {
						if (a > b) return 1;
						if (a < b) return -1;
						return 0;
					});
					let templates = a.join(',');

					if (typeof templatesExample === 'undefined') {
						templatesExample = templates;
					} else {
						if (templatesExample !== templates) {
							(() => {
								let localLangId = langId;
								let localTextId = textId;
								game.editor.ui.status.warn('Localization data with id "' + textId + '" has no matched %d %s templates set.', 32052, () => {
									LanguageView.editKey(localTextId, localLangId);
								});
							})();
						}
					}
				}
			}
		});
	}

	static __getTextAssets() {
		return languages;
	}
}

const assetsUpdateHandler = (enforced = false) => {
	if (assetsFilesIsDirty && (game.editor.isProjectOpen || enforced)) {
		parseAssets();
		if (instance) {
			instance.refresh();
		}
	}
};

let initialized = false;
const init = () => {
	initialized = true;
	editorEvents.on('assetsRefreshed', assetsUpdateHandler);
	editorEvents.on('firstSceneWillOpen', () => assetsUpdateHandler(true));
};


const __serializeLanguage = (langData: KeyedObject, empty = false) => {
	let ret: KeyedObject = {};
	for (let srcId in langData) {
		if (langData.hasOwnProperty(srcId)) {
			let a = srcId.split(/[\.]/gm);
			let r = ret;
			while (a.length > 1) {
				let pathPart = a.shift() as string;
				if (!r.hasOwnProperty(pathPart)) {
					r[pathPart] = {};
				}
				r = r[pathPart];
			}
			r[a[0]] = empty ? '' : langData[srcId];
		}
	}
	return ret;
};

const parseAssets = () => {
	assetsFilesIsDirty = false;

	const list = LanguageView.selectableList;
	list.length = 0;

	assetsDirs.length = 0;
	langsIdsList.length = 0;
	currentIdsList.length = 0;

	languages = {};

	assetsFiles.clear();

	const files = fs.getAssetsList(AssetType.L10N) as FileDescL10n[];

	for (const file of files) {
		const a = file.fileName.split('/');
		if (!file.lang) {
			file.lang = (a.pop()!).replace(/\.l\.json$/, '');
		}
		if (!file.dir) { // can be already set in assets-loader.cjs
			file.dir = a.join('/');
		}
	}

	files.sort(sortLanguages);

	for (const file of files) {
		if (!assetsFiles.has(file.dir)) {
			assetsFiles.set(file.dir, new Map());
			assetsDirs.push(file.dir);
		}
		if (!currentDir) {
			currentDir = file.dir;
		}
		assetsFiles.get(file.dir)!.set(file.lang, file);

		const langId = file.lang;
		let langData: L10NData;
		if (!languages[file.lang]) {
			langsIdsList.push(langId);
			langData = {};
			languages[langId] = langData;
		} else {
			langData = languages[langId];
		}
		Object.assign(langData, file.asset);
	}

	currentDirAssets = assetsFiles.get(currentDir)!;

	const firstFile = currentDirAssets.values().next().value;
	for (let key in firstFile.asset) {
		currentIdsList.push(key);
	}

	L.setLanguagesAssets(languages);
	L.setCurrentLanguage();

	currentLanguageData = languages[L.getCurrentLanguageId()];

	for (let key in currentLanguageData) {
		list.push({
			value: key,
			name: key
		});
	}

	list.sort(sortTextList);

	list.unshift({
		value: null,
		name: '- - -'
	});

	assetsFiles.forEach((folderFiles: Map<string, FileDescL10n>) => {
		const langs = L.getLanguagesList();
		for (const langId of langs) {
			if (!folderFiles.has(langId)) {
				L.getLanguagesList();
				createFilesForLanguage(langId);
			}
		}
	});
	generateLocalizationTypings();
};

const generateLocalizationTypings = () => {
	const src = ['interface LocalizationKeys {'];
	for (const key in currentLanguageData) {
		src.push('(id: \'' + key + '\', values?: KeyedObject): string;');
	}
	src.push('}\n');
	fs.writeFile('/thing-editor/src/editor/localization-typings.d.ts', src.join('\n'));
};

const sortTextList = (a: SelectEditorItem, b: SelectEditorItem) => {
	if (a.value > b.value) {
		return 1;
	} else {
		return -1;
	}
};

//////////////////////////////////////////////////////////
////// TABLE ////////////////////////////////////////////
////////////////////////////////////////////////////////

const tableBodyProps = { className: 'langs-editor-table' };
const langsEditorProps = { className: 'langs-editor' };
const langsEditorWrapperProps = { className: 'langs-editor-wrapper' };

function showTextTable(): Promise<void> {
	return new Promise((resolve) => {
		if (!view) {
			LanguageView.toggle();
			window.setTimeout(resolve, 1);
		} else {
			resolve();
		}
	});
}

let view: LanguageTableEditor | null;

interface LanguageTableEditorState {
	filter?: string;
}

class LanguageTableEditor extends ComponentDebounced<ClassAttributes<LanguageTableEditor>, LanguageTableEditorState> {

	searchInputProps = {
		className: 'language-search-input',
		onInput: this.onSearchChange.bind(this),
		placeholder: 'Search',
		value: ''
	};

	constructor(props: ClassAttributes<LanguageTableEditor>) {
		super(props);
		this.onAddNewLanguageClick = this.onAddNewLanguageClick.bind(this);
		this.onAddNewKeyClick = this.onAddNewKeyClick.bind(this);
		this.state = {};
	}

	onSearchChange(ev: InputEvent) {
		this.searchInputProps.value = (ev.target as any).value;
		this.setState({ filter: (ev.target as any).value.toLowerCase() });
	}

	componentDidMount() {
		view = this;
	}

	componentWillUnmount() {
		view = null;
		LanguageView.__validateTextData();
	}

	onAddNewLanguageClick() {
		game.editor.ui.modal.showPrompt('Enter new language ID:',
			'ru',
			(langId) => { //filter
				return langId.toLowerCase();
			},
			(langId) => { //accept
				if (currentLanguageData.hasOwnProperty(langId)) {
					return 'Language with ID=' + langId + ' already exists';
				}
			}
		).then((langId) => {
			if (langId) {
				createFilesForLanguage(langId);
				this.forceUpdate();
			}
		});
	}

	onAddNewKeyClick() {

		let defaultKey = game.editor.projectDesc.__localesNewKeysPrefix;
		for (let o of game.editor.selection) {
			let props = (o.constructor as SourceMappedConstructor).__editableProps;
			for (let p of props) {
				if (p.isTranslatableKey) {
					let k = (o as any)[p.name];
					if (k) {
						if (!L.has(k)) {
							defaultKey = k;
						}
						break;
					}
				}
			}
		}
		if (!defaultKey) {
			if (currentIdsList[0]) {
				let a = currentIdsList[0].split('.');
				a.pop();
				defaultKey = a.join('.');
				if (defaultKey) {
					defaultKey += '.';
				}
			} else {
				defaultKey = '';
			}
		}

		game.editor.ui.modal.showPrompt('Enter new translatable KEY:',
			defaultKey,
			(key) => { //filter
				return key;
			},
			isKeyInvalid
		).then((enteredName) => {
			if (enteredName) {
				this.createKeyOrEdit(enteredName, undefined, true);
			}
		});
	}

	createKeyOrEdit(key: string, langId = 'en', enforceCreateInCurrentSource = false) {
		showTextTable().then(() => {

			if (!enforceCreateInCurrentSource) {
				if (!currentIdsList.includes(key)) { // find key in another source
					for (const dirAssets of assetsFiles.values()) {
						for (const file of dirAssets.values()) {
							if (file.asset.hasOwnProperty(key)) {
								currentDir = file.dir;
								parseAssets();
								this.refresh();

								setTimeout(() => {
									this.createKeyOrEdit(key, langId, enforceCreateInCurrentSource);
								}, 20);
								return;
							}
						}
					}
				}
			}

			if (!currentLanguageData.hasOwnProperty(key)) {
				currentDirAssets.forEach((file) => {
					file.asset[key] = '';
				});
				parseAssets();
				onModified(langId);
				this.forceUpdate();

				if (game.editor.selection.length === 1) {
					if (game.editor.selection[0] instanceof Text) {
						let t = game.editor.selection[0];
						if (((!t.text) || (t.text === 'New Text 1')) && !t.translatableText) {
							game.editor.onObjectsPropertyChanged(t, 'translatableText', key);
						}
					}
				}
			}
			window.setTimeout(() => {
				let area = document.querySelector('.langs-editor-table #' + textAreaID(langId, key)) as HTMLTextAreaElement;
				scrollInToViewAndShake(area);
				area.focus();
			}, 10);
		});
	}

	render() {

		let lines: ComponentChild[] = [];

		let header = R.div({ className: 'langs-editor-tr langs-editor-header' }, R.div({ className: 'langs-editor-th' }), langsIdsList.map((langId) => {
			return R.div({ key: langId, className: 'langs-editor-th' }, langId);
		}));

		currentIdsList.forEach((id) => {
			let filter = this.state.filter;
			if (filter) {
				if (id.indexOf(filter) < 0) {
					if (langsIdsList.every(langId => (currentDirAssets.get(langId)!).asset[id].toLowerCase().indexOf(filter!) < 0)) {
						return;
					}
				}
			}

			lines.push(R.span({ key: id, className: 'langs-editor-tr' },
				R.div({
					className: 'langs-editor-th selectable-text',
					title: 'Ctrl+click to copy key, Double click to rename, Right click to delete',
					onContextMenu: sp,
					onMouseDown: (ev: PointerEvent) => {
						let currentKey = (ev.target as any).innerText as string;

						if (ev.buttons === 2) {
							return game.editor.ui.modal.showEditorQuestion('Translatable key delete', 'Delete key ' + currentKey + '?', () => {
								currentDirAssets.forEach((file) => {
									delete file.asset[currentKey];
								});
								onModified();
								this.forceUpdate();
							});
						}
						else if (ev.ctrlKey) {
							copyTextByClick(ev);
						}
						sp(ev);
					},
					onDoubleClick: (ev: PointerEvent) => {
						let currentKey = (ev.target as any).innerText as string;

						return game.editor.ui.modal.showPrompt('Translatable key rename:', currentKey, undefined, (nameToCheck) => {
							if (nameToCheck === currentKey) {
								return 'Please rename key.';
							}
							if (currentLanguageData.hasOwnProperty(nameToCheck)) {
								return 'Key with that name already exists.';
							}
						}).then((newKey) => {
							if (newKey) {
								currentDirAssets.forEach((file) => {
									file.asset[newKey] = currentLanguageData[id];
									delete file.asset[id];
								});

								onModified();
								this.forceUpdate();
							}
						});
					}
				}, id),
				langsIdsList.map((langId) => {

					const asset = currentDirAssets.get(langId)!;

					let text = asset.asset[id];

					let areaId = textAreaID(langId, id);

					return R.div({ key: langId, className: asset.__isLangIdPlaceHolder ? 'langs-editor-td disabled' : 'langs-editor-td' },
						R.textarea({
							key: asset.assetName + '_' + areaId,
							value: text,
							id: areaId,
							disabled: asset.readOnly,
							onInput: (ev: InputEvent) => {
								console.log('edited: ' + id);
								asset.asset[id] = (ev.target as any).value as string;
								parseAssets();
								onModified(langId);
							}
						})
					);
				})
			));
		});

		if (!this.state.filter) {
			lines = group.groupArray(lines, '.');
		}

		const select: SelectEditorItem[] = assetsDirs.map((dir) => {
			return { value: dir, name: dir };
		});

		return R.div(langsEditorProps,
			R.btn('+ Add translatable KEY...', this.onAddNewKeyClick, undefined, 'main-btn'),
			R.btn('+ Add language...', this.onAddNewLanguageClick),
			R.input(this.searchInputProps),
			(assetsDirs.length > 1) ? R.div(null, 'Localization data source: ',
				h(SelectEditor, {
					onChange: (value: string) => {
						if (value !== currentDir) {
							currentDir = value;
							parseAssets();
							this.forceUpdate();
						}

					}, noCopyValue: true, value: currentDir, select
				})
			) : R.div(null, currentDir),
			R.div(langsEditorWrapperProps,
				header,
				R.div(tableBodyProps,
					lines
				)
			)
		);
	}
}

function isKeyInvalid(val: string) {
	if (currentLanguageData.hasOwnProperty(val)) {
		return 'ID already exists';
	}
	if (val.endsWith('.') || val.startsWith('.')) {
		return 'ID can not begin or end with "."';
	}
	if (val.match(/[^a-zA-Z\._\d\/]/gm)) {
		return 'ID can contain letters, digits, "_", "/" and "."';
	}
}

const idFixer = /[^0-9a-z\-]/ig;
function textAreaID(lang: string, id: string) {
	return (lang + '-' + id).replace(idFixer, '-');
}


let debounceTimeOut = 0;
function onModified(modifiedLangId?: string) {
	if (modifiedLangId) {
		currentDirAssets.get(modifiedLangId)!.isDirty = true;
	} else {
		for (const file of 	currentDirAssets.values()) {
			file.isDirty = true;
		}
	}
	if (debounceTimeOut) {
		clearTimeout(debounceTimeOut);
	}

	debounceTimeOut = window.setTimeout(() => {
		L.refreshAllTextEverywhere();

		currentDirAssets.forEach((file) => {
			if (!file.readOnly) {
				if (file.isDirty) {
					let content = __serializeLanguage(file.asset);
					fs.saveAsset(file.assetName, AssetType.L10N, content, undefined, true);
				}
			}
		});

		debounceTimeOut = 0;
	}, 600);
	parseAssets();
}

function createFilesForLanguage(langId: string) {
	let created = false;

	assetsFiles.forEach((dirAssets: Map<string, FileDescL10n>, dir: string) => {
		if (!dirAssets.has(langId)) {
			if (dir.endsWith('.l.json')) {
				// add placeholders for non standard translations added via assets-loader.js
				const placeholder = Object.assign({}, dirAssets.values().next().value) as FileDescL10n;
				placeholder.__isLangIdPlaceHolder = true;
				dirAssets.set(langId, placeholder);
			} else if (!game.projectDesc.__doNotAutoCreateLocalizationFiles) {

				let langData: KeyedObject = __serializeLanguage((currentDirAssets.values().next().value as FileDescL10n).asset, true);
				const fileName = dir + '/' + langId + '.l.json';
				fs.writeFile(fileName, langData);
				game.editor.ui.status.warn('Localization file ' + fileName + ' created.', 90001, () => {
					fs.showFile(fileName);
				});

				created = true;
			}
		}
		if (created) {
			fs.refreshAssetsList();
		}
	});
}
