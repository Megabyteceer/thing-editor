import type { Container } from 'pixi.js';
import R from 'thing-editor/src/editor/preact-fabrics';

import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

let currentLanguageTable: KeyedMap<string> = {};
/// #if EDITOR
let warnedIds: KeyedMap<true> = {};
/// #endif

let languages: KeyedMap<KeyedMap<string>> = {};
let currentLanguageId = (window.navigator && navigator.language) ? navigator.language.split('-')[0] : 'en';
let isLangDataLoaded = false;

interface TL extends LocalizationKeys {
	(id: string, values?: KeyedObject): string;
	setLanguagesAssets: (src: KeyedObject) => void;
	messageProcessor: (text: string, values?: KeyedObject) => string;
	has: (id: string) => boolean;
	setCurrentLanguage: (languageId?: string) => void;
	refreshAllTextEverywhere: () => void;
	getCurrentLanguageId: () => string;
	getLanguagesList: () => string[];
	_deserializeLanguage: (langSrc: KeyedObject) => KeyedMap<string>;
}

const L: TL = ((id: string, values?: KeyedObject): string => {
	/// #if EDITOR
	if (!currentLanguageTable.hasOwnProperty(id)) {
		let fieldName: string;
		const tryToFindOwner = () => {
			let owner: Container | undefined;
			game.forAllChildrenEverywhere((o: Container) => {
				if (owner) {
					return;
				}
				let props = (o.constructor as SourceMappedConstructor).__editableProps;
				for (let p of props) {
					if (p.isTranslatableKey && (o as KeyedObject)[p.name] === id) {
						fieldName = p.name;
						owner = o;
						return;
					}
				}
			});
			if (owner) {
				let tryToFixKey = game.editor.projectDesc.__localesNewKeysPrefix + id.split('.').pop();
				if (currentLanguageTable.hasOwnProperty(tryToFixKey)) {
					game.editor.onObjectsPropertyChanged(owner, fieldName, tryToFixKey);
					game.editor.ui.modal.notify('key changed to: ' + tryToFixKey);
				}
				game.editor.ui.sceneTree.selectInTree(owner);
				game.editor.ui.propsEditor.selectField(fieldName);
			} else {
				let txt = R.span(null, 'Do you want to create translatable key ', R.b(null, '"' + id + '"'), '?');
				game.editor.ui.modal.showEditorQuestion(txt, txt, () => {
					game.editor.LanguageView.editKey(id);
				}, 'Create');
			}
		};
		if (!warnedIds.hasOwnProperty(id)) {
			warnedIds[id] = true;
			game.editor.ui.status.warn('Translatable text key \'' + id + '\' is not exists.', 32031, tryToFindOwner);
			window.setTimeout(() => {
				warnedIds = {};
			}, 1000);
		}
	}
	/// #endif

	let ret;
	if (currentLanguageTable.hasOwnProperty(id)) {
		ret = currentLanguageTable[id];
		if (L.messageProcessor) {
			ret = L.messageProcessor(ret, values);
		}
	} else {
		ret = id;
	}
	if (values) {
		for (let key in values) {
			ret = ret.replace(key, values[key]);
		}

	}
	return ret;
}) as any;

L.has = (id: string) => {
	return currentLanguageTable.hasOwnProperty(id);
};

L.setCurrentLanguage = (languageId?: string) => {
	if (!isLangDataLoaded) {
		assert(languageId, 'languageId expected.');
		currentLanguageId = languageId!;
		return;
	}
	if (currentLanguageId !== languageId) {

		if (languageId && languages.hasOwnProperty(languageId)) {
			currentLanguageId = languageId;
		} else {
			currentLanguageId = game.projectDesc.defaultLanguage;
			if (window.navigator && navigator.languages) {
				for (let l of navigator.languages) {
					l = l.split('-')[0];
					if (languages.hasOwnProperty(l)) {
						currentLanguageId = l;
						break;
					}
				}
			}
		}
		currentLanguageTable = languages[currentLanguageId];
		L.refreshAllTextEverywhere();
	}
};

L.setLanguagesAssets = (_languages: KeyedMap<KeyedMap<string>>) => {
	isLangDataLoaded = true;
	for (let langId in _languages) {
		languages[langId] = Object.assign(languages[langId] || {}, _languages[langId]);
	}
	L.setCurrentLanguage();
};

L.refreshAllTextEverywhere = () => {
	if (game.stage) {
		game.forAllChildrenEverywhere(refreshTranslatableText);
	}
};

function refreshTranslatableText(o: any) {
	if (o.onLanguageChanged) {
		o.onLanguageChanged();
	}
}

L.getCurrentLanguageId = () => {
	return currentLanguageId;
};

L.getLanguagesList = () => {
	return Object.keys(languages);
};

L._deserializeLanguage = (langSrc: KeyedObject): KeyedMap<string> => {
	let ret: KeyedMap<string> = {};
	deserializeEntry(langSrc, ret);
	return ret;
};

const deserializeEntry = (src: KeyedObject, output: KeyedMap<string>, path?: string) => {
	for (let key in src) {
		if (src.hasOwnProperty(key)) {
			let val = src[key];
			if ((typeof val) === 'string') {
				if (path) {
					output[path + key] = src[key];
				} else {
					output[key] = src[key];
				}
			} else {
				if (path) {
					deserializeEntry(val, output, path + key + '.');
				} else {
					deserializeEntry(val, output, key + '.');
				}
			}
		}
	}
};

export default L;
