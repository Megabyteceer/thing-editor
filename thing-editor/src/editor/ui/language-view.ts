import { ClassAttributes, ComponentChild, h } from "preact";
import { KeyedMap, KeyedObject } from "thing-editor/src/editor/env";
import { FileDescL18n } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import { SelectEditorItem } from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
import { hideAdditionalWindow, showAdditionalWindow } from "thing-editor/src/editor/ui/ui";
import { editorEvents } from "thing-editor/src/editor/utils/editor-events";
import game from "thing-editor/src/engine/game";
import L from "thing-editor/src/engine/utils/l";

let currentLanguageTable: KeyedMap<string> = {};
let languages: KeyedMap<KeyedMap<string>> = {};

let instance: LanguageView | null;

const assetsFiles: Set<FileDescL18n> = new Set();
let assetsFilesIsDirty = false;

export default class LanguageView extends ComponentDebounced<ClassAttributes<LanguageView>> {

	componentDidMount(): void {
		instance = this;
	}

	componentWillUnmount(): void {
		instance = null;
	}

	render(): ComponentChild {

		const ret: ComponentChild[] = [];

		assetsFiles.forEach((file) => {
			ret.push(R.div(null, file.assetName));
		})
		return ret;
	}

	static selectableList: SelectEditorItem[] = [];

	static addAssets(file: FileDescL18n) {
		if(!initialized) {
			init();
		}
		file.asset = L._deserializeLanguage(file.asset);
		assetsFiles.add(file);
		assetsFilesIsDirty = true;
	}

	static removeAsset(file: FileDescL18n) {
		assetsFiles.delete(file);
		assetsFilesIsDirty = true;
	}

	static toggle() {
		if(!instance) {
			showAdditionalWindow('language-view', 'language-view', 'Localization', h(LanguageView, null), 40, 0, 100, 70, 900, 500);
		} else {
			hideAdditionalWindow('language-view');
		}
	}

	static editKey(id: string | null, language: string = L.getCurrentLanguageId()) {
		LanguageView.toggle();
	}
}

const assetsUpdateHandler = (enforced = false) => {
	if(assetsFilesIsDirty && (game.editor.isProjectOpen || enforced)) {
		parseAssets();
		if(instance) {
			instance.refresh();
		}
	}
}

let initialized = false;
const init = () => {
	initialized = true;
	editorEvents.on('assetsRefreshed', assetsUpdateHandler);
	editorEvents.on('firstSceneWillOpen', () => assetsUpdateHandler(true));
}

const __validateTextData = function () {
	for(let textId in currentLanguageTable) {
		let templatesExample;

		for(let langId in languages) {
			let langData = languages[langId];
			let text = langData[textId];
			if(text) {

				let a: string[] = [];
				text.replace(/%\w/gm, ((m: string) => {
					a.push(m);
				}) as any)

				a.sort((a, b) => {
					if(a > b) return 1;
					if(a < b) return -1;
					return 0;
				});
				let templates = a.join(',');

				if(typeof templatesExample === 'undefined') {
					templatesExample = templates;
				} else {
					if(templatesExample !== templates) {
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
	}
}

const __serializeLanguage = (langData: KeyedObject) => {
	let ret: KeyedObject = {};
	for(let srcId in langData) {
		if(langData.hasOwnProperty(srcId)) {
			let a = srcId.split(/[\.]/gm);
			let r = ret;
			while(a.length > 1) {
				let pathPart = a.shift() as string;
				if(!r.hasOwnProperty(pathPart)) {
					r[pathPart] = {};
				}
				r = r[pathPart];
			}
			r[a[0]] = langData[srcId];
		}
	}
	return ret;
}

const parseAssets = () => {
	assetsFilesIsDirty = false;

	const list = LanguageView.selectableList;
	list.length = 0;

	languages = {};

	for(let folder of game.editor.assetsFolders) {
		assetsFiles.forEach((file: FileDescL18n) => {
			if((file.lib ? file.lib.assetsDir : game.editor.currentProjectAssetsDir) === folder) {
				const langId = file.assetName.split('/').pop() as string;
				let langData: KeyedMap<string>;
				if(!languages[langId]) {
					langData = {};
					languages[langId] = langData;
				} else {
					langData = languages[langId];
				}
				Object.assign(langData, file.asset);
			}
		});
	}
	L.setLanguagesAssets(languages);
	L.setCurrentLanguage();

	currentLanguageTable = languages[L.getCurrentLanguageId()];

	for(let key in currentLanguageTable) {
		list.push({
			value: key,
			name: key + ': ' + currentLanguageTable[key]
		});
	}

	list.sort(sortTextList);

	list.unshift({
		value: null,
		name: '- - -'
	});
}

const sortTextList = (a: SelectEditorItem, b: SelectEditorItem) => {
	if(a.value > b.value) {
		return 1;
	} else {
		return -1;
	}
}