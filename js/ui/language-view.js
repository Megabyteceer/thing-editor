import Group from "./group.js";
import Window from './window.js';
import L from "/thing-engine/js/utils/l.js";

let languages;
let langsIdsList;
let oneLanguageTable;
let idsList;

const tableBodyProps = {className:'langs-editor-table'};
const langsEditorProps = {className:'langs-editor'};

let view;
let switcher;

function showTextTable() {
	setTimeout(() => {
		Window.bringWindowForward($('#window-texteditor'));
	}, 1);
	return new Promise((resolve) => {
		if(!view) {
			switcher.onToggleClick();
			setTimeout(resolve, 1);
		} else {
			resolve();
		}
	});
}

export default class LanguageView extends React.Component {
	
	static loadTextData() {
		let ret = editor.fs.openFile('text.json');
		ret.then((data) => {
			languages = data;
			L.setLanguagesAssets(data);
			refreshCachedData();
			for(let langId in data) {
				let txt = data[langId];
				for(let id in txt) {
					if(!txt[id]) {
						editor.ui.status.warn('untranslated text entry ' + id + '/' + id, () => {
							LanguageView.editKey(id, langId);
						}); 
					}
				}
			}
		});
		return ret;
	}

	static editKey(key, langId) {
		showTextTable().then(() => {
			if(key) {
				view.createKeyOrEdit(key, langId);
			} else {
				view.onAddNewKeyClick();
			}
		});
	}
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onToggleClick = this.onToggleClick.bind(this);
		switcher = this;
	}
	
	onToggleClick() { //show/hide text editor window
		let t = !this.state.toggled;
		this.setState({toggled: t});
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close Text Editor (Ctrl+E)' : 'Open Text Editor (Ctrl+E)', this.onToggleClick, undefined, undefined, 1069);
		let table;
		if(this.state.toggled) {
			table = editor.ui.renderWindow('texteditor', 'Text Table', R.fragment(
				R.btn('×', this.onToggleClick, 'Hide Text Editor', 'close-window-btn'),
				React.createElement(LanguageTableEditor)), 200, 100, 620, 300, 900, 800);
		}
		return R.fragment(btn, table);
	}
}

const idFixer = /[^a-z\-]/i;
function texareaID(lang, id) {
	return lang + '-' + id.replace(idFixer, '-');
}

class LanguageTableEditor extends React.Component {
	
	constructor (props) {
		super(props);
		view = this;
		this.onAddNewLanguageClick = this.onAddNewLanguageClick.bind(this);
		this.onAddNewKeyClick = this.onAddNewKeyClick.bind(this);
	}
	
	onAddNewLanguageClick() {
		editor.ui.modal.showPrompt('Enter new language ID:',
			'ru',
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
				let lang = {};
				languages[enteredName] = lang;
				
				for(let langId of idsList) {
					lang[langId] = '';
				}
				onModified();
				refreshCachedData();
				this.forceUpdate();
			}
		});
	}
	
	onAddNewKeyClick() {

		let defaultKey = '';
		for(let o of editor.selection) {
			let props = editor.enumObjectsProperties(o);
			for(let p of props) {
				if(p.isTranslatableKey) {
					let k = o[p.name];
					if(k && k !==' ') {
						if(!L.has(k)) {
							defaultKey = k;
						}
						break;
					}
				}
			}
		}

		editor.ui.modal.showPrompt('Enter new translatable KEY:',
			defaultKey,
			(val) => { //filter
				return val;
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
				this.createKeyOrEdit(enteredName);
			}
		});
	}
	
	createKeyOrEdit(key, langId = 'en') {
		showTextTable().then(() => {
			if(!oneLanguageTable.hasOwnProperty(key)) {
				for(let langId of langsIdsList) {
					languages[langId][key] = '';
				}
			
				onModified();
				refreshCachedData();
				this.forceUpdate();
			
				if(editor.selection.length === 1) {
					if(editor.selection[0] instanceof PIXI.Text) {
						let t = editor.selection[0];
						if((t.text === ' ') && !t.translatableText) {
							t.translatableText = key;
						}
					}
				}
			}

			let area = $('.langs-editor-table #' + texareaID(langId, key));
			area.focus();
			area[0].scrollIntoView({});
			
			area.removeClass('shake');
			setTimeout(() => {
				area.addClass('shake');
			}, 1);
		});
	}
	
	render() {
		
		let lines = [];
		
		let header = R.div({className:'langs-editor-tr langs-editor-header'}, R.div({className:'langs-editor-th'}), langsIdsList.map((langId) => {
			return R.div({key:langId, className:'langs-editor-th'}, langId);
		}));
		
		idsList.some((id) => {
			lines.push(R.div({key: id, className:'langs-editor-tr'},
				R.div({className:'langs-editor-th selectable-text', onMouseDown: copyTextByClick}, id),
				langsIdsList.map((langId) => {
					let text = languages[langId][id];
					return R.div({key: langId, className:'langs-editor-td'}, R.textarea({defaultValue: text, id:texareaID(langId, id), onChange:(ev) => {
						languages[langId][id] = ev.target.value;
						onModified();
					}}));
				})
			));
		});
		
		lines = Group.groupArray(lines);
		
		return R.div(langsEditorProps,
			R.btn('+ Add translatable KEY...', this.onAddNewKeyClick, undefined, 'main-btn'),
			header,
			R.div(tableBodyProps,
				lines
			),
			R.btn('+ Add language...', this.onAddNewLanguageClick)
		);
	}
}

function refreshCachedData() {
	langsIdsList = Object.keys(languages);
	langsIdsList.sort((a, b) => {
		return langIdPriority(a) > langIdPriority(b);
	});
	oneLanguageTable = languages[langsIdsList[0]];
	idsList = Object.keys(oneLanguageTable);
	
	let a = [{name:'none', value:''}];
	for(let id of idsList) {
		a.push({name:id, value:id});
	}
	
	LanguageView._keysSelectableList = a;
}

window.makeTranslatableSelectEditablePropertyDecriptor = (name, important) => {
	let ret = {
		name: name,
		type: String,
		important: important,
		isTranslatableKey: true
	};
	Object.defineProperty(ret, 'select', {
		get: () => {
			return LanguageView._keysSelectableList;
		}
	});
	return ret;
};


let _outjump;
function onModified() {
	if(_outjump) {
		clearTimeout(_outjump);
	}
	
	_outjump = setTimeout(() => {
		L.fefreshAllTextEwerywhere();
		editor.fs.saveFile('text.json', languages, true);
		_outjump = null;
	}, 600);
}

function langIdPriority(l) {
	return l === 'en' ? ' ' : l;
}