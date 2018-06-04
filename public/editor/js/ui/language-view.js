import Group from "./group.js";

let languages;
let langsIdsList;
let oneLanguageTable;
let idsList;
let isModified = false;

const tableBodyProps = {className:'langs-editor-table'};
const langsEditorProps = {className:'langs-editor'};
const DEFAULT_TEXT = '!!';

export default class LanguageView extends React.Component {
	
	static show() {
		showLanguageEditor();
	}
	
	static async loadTextData() {
		let ret = editor.fs.openFile('text.json');
		ret.then((data) => {
			languages = data;
			L.setLanguagesAssets(data);
			refreshCachedData();
		});
		return ret;
	}
	
	constructor (props) {
		super(props);
		this.onAddNewLanguageClick = this.onAddNewLanguageClick.bind(this);
		this.onAddNewKeyClick = this.onAddNewKeyClick.bind(this);
	}
	
	onAddNewLanguageClick() {
		editor.ui.modal.showPrompt('Enter new ID:',
			'',
			(val) => { //filter
				return val.toLowerCase();
			},
			(val) => { //accept
				if (languages.hasOwnProperty(val)) {
					return "Language with ID=" + val + " already exists";
				}
			}
		).then((enteredName) => {
			if (enteredName) {
				var lang = {};
				languages[enteredName] = lang;
				
				for(let langId of idsList) {
					lang[langId] = DEFAULT_TEXT;
				}
				isModified = true;
				refreshCachedData();
				this.forceUpdate();
			}
		});
	}
	
	onAddNewKeyClick() {
		editor.ui.modal.showPrompt('Enter new translatable KEY:',
			'',
			(val) => { //filter
				return val.toUpperCase();
			},
			(val) => { //accept
				if (oneLanguageTable.hasOwnProperty(val)) {
					return "ID already exists";
				}
				if (val.endsWith('/') || val.startsWith('/')) {
					return 'ID can not begin or end with "/"';
				}
			}
		).then((enteredName) => {
			if (enteredName) {
				for(let langId of langsIdsList) {
					languages[langId][enteredName] = DEFAULT_TEXT;
				}
				isModified = true;
				refreshCachedData();
				this.forceUpdate();
			}
		});
	}
	
	
	render() {
		
		let lines = [];
		
		let header = R.div({className:'langs-editor-tr langs-editor-header'}, R.div({className:'langs-editor-th'}), langsIdsList.map((langId) => {
			return R.div({key:langId, className:'langs-editor-th'}, langId);
		}));
		
		let untranslatedCounts = {};
		let totallyUntranslated = 0;
		
		idsList.some((id) => {
			lines.push(R.div({key: id, className:'langs-editor-tr'},
				R.div({className:'langs-editor-th'}, id),
				langsIdsList.map((langId) => {
					let text = languages[langId][id];
					if(text === DEFAULT_TEXT) {
						untranslatedCounts[langId] = (untranslatedCounts[langId] || 0) + 1;
						totallyUntranslated++;
					}
					return R.div({key: langId, className:'langs-editor-td'}, R.textarea({defaultValue: text, onChange:(ev) => {
						languages[langId][id] = ev.target.value;
						isModified = true;
					}}));
				})
			));
		});
		let footer;
		if(totallyUntranslated > 0) {
			footer = R.div({className:'langs-editor-tr langs-editor-footer'}, R.div({className:'langs-editor-th'}, 'Untranslated: ' + totallyUntranslated), langsIdsList.map((langId) => {
				return R.div({key:langId, className:'langs-editor-th'}, untranslatedCounts[langId]);
			}));
		}
		
		lines = Group.groupArray(lines);
		
		return R.div(langsEditorProps,
			R.btn('+ Add language...', this.onAddNewLanguageClick),
			header,
			R.div(tableBodyProps,
				lines
			),
			footer,
			R.btn('+ Add translatable KEY...', this.onAddNewKeyClick)
		)
	}
}

function refreshCachedData() {
	langsIdsList = Object.keys(languages);
	langsIdsList.sort((a, b) => {
		return langIdPriority(a) > langIdPriority(b);
	});
	oneLanguageTable = languages[langsIdsList[0]];
	idsList = Object.keys(oneLanguageTable);
	
	let a = [{name:'', value:null}];
	for(let id of idsList) {
		a.push({name:id, value:id});
	}
	
	LanguageView._keysSelectableList = a;
}

window.makeTranslatableSelectEditablePropertyDecriptor = (name, important) => {
	let ret = {
		name: name,
		type: String,
		important: important
	};
	Object.defineProperty(ret, 'select', {
		get: () => {
			return LanguageView._keysSelectableList;
		}
	});
	return ret;
};

function onHide() {
	if(isModified) {
		editor.fs.saveFile('text.json', languages, true).then(() => {
			isModified = false;
		});
	}
}

function langIdPriority(l) {
	return l === 'en' ? ' ' : l;
}


function showLanguageEditor() {
	editor.ui.modal.showModal(React.createElement(LanguageView), 'Translatable text table').then(onHide);
}