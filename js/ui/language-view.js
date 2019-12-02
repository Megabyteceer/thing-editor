import Window from './window.js';
import L from "thing-engine/js/utils/l.js";
import Group from './group.js';

let languages;
let langsIdsList;
let oneLanguageTable;
let idsList;

const tableBodyProps = {className:'langs-editor-table'};
const langsEditorProps = {className:'langs-editor'};
const langsEditorWrapperProps = {className:'langs-editor-wrapper'};

let view;
let switcher;
let externalLangsData;

function showTextTable() {
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
		let langsIds = editor.fs.files.i18n.filter((fn) => {
			return fn.endsWith('.json');
		}).map((fn) => {
			return fn.split('/').pop().split('.').shift();
		});

		return L.loadLanguages(langsIds, '/games/' + editor.currentProjectDir + editor.projectDesc.localesPath).then((langsData) => {
			languages = langsData;
			refreshCachedData();
			for(let langId in langsData) {
				let txt = langsData[langId];
				for(let id in txt) {
					if(!txt[id]) {
						editor.ui.status.warn('Untranslated text entry ' + langId + '/' + id, 32017, () => {
							LanguageView.editKey(id, langId);
						}); 
					}
				}
			}
			if(editor.projectDesc.__externalLocalesSource) {
				L.loadLanguages(['en'], editor.projectDesc.__externalLocalesSource, true).then((_externalLangsData) => {
					externalLangsData = _externalLangsData;
					refreshCachedData();
				});
			}
		});
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
		if(t) {
			Window.bringWindowForward('#window-texteditor', true);
		}
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close Text Editor (Ctrl+E)' : 'Open Text Editor (Ctrl+E)', this.onToggleClick, undefined, 'menu-btn', 1069);
		let table;
		if(this.state.toggled) {
			table = editor.ui.renderWindow('texteditor', 'Text', 'Text Table', R.fragment(
				R.btn('×', this.onToggleClick, 'Hide Text Editor', 'close-window-btn'),
				React.createElement(LanguageTableEditor)), 200, 100, 710, 300, 900, 800);
		}
		return R.fragment(btn, table);
	}
}

const idFixer = /[^0-9a-z\-]/ig;
function texareaID(lang, id) {
	return (lang + '-' + id).replace(idFixer, '-');
}

function isKeyInvalid(val) {
	if (oneLanguageTable.hasOwnProperty(val)) {
		return "ID already exists";
	}
	if (L.__isExternalKey(val)) {
		return "ID already exists in external data " + editor.game.projectDesc.__externalLocalesSource;
	}
	if (val.endsWith('.') || val.startsWith('.')) {
		return 'ID can not begin or end with "."';
	}
	if (val.match(/[^a-zA-Z\._\d\/]/gm)) {
		return 'ID can contain letters, digits, "_", "/" and "."';
	}
}

class LanguageTableEditor extends React.Component {
	
	constructor (props) {
		super(props);
		this.onAddNewLanguageClick = this.onAddNewLanguageClick.bind(this);
		this.onAddNewKeyClick = this.onAddNewKeyClick.bind(this);
		this.state = {};
		this.searchInputProps = {
			className: 'language-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: ''
		};
	}

	onSearchChange(ev) {
		this.setState({filter: ev.target.value.toLowerCase()});
	}

	componentDidMount() {
		view = this;
	}

	componentWillUnmount() {
		view = null;
		L.__validateTextData();
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

		let defaultKey = editor.projectDesc.__localesNewKeysPrefix;
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
			isKeyInvalid
		).then((enteredName) => {
			if (enteredName) {
				this.createKeyOrEdit(enteredName);
			}
		});
	}
	
	createKeyOrEdit(key, langId = 'en') {
		showTextTable().then(() => {

			if(L.__isExternalKey(key)) {
				editor.ui.status.warn("Can not edit key '" + key + "', because it is external (" + editor.game.projectDesc.__externalLocalesSource + ").", 32034);
				return;
			} 

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
			setTimeout(() => {
				let area = document.querySelector('.langs-editor-table #' + texareaID(langId, key));
				area.focus();
				area.scrollIntoView({block: "center", inline: "center"});
				window.shakeDomElement(area);
			}, 10);
		});
	}
	
	render() {
		
		let lines = [];
		
		let header = R.div({className:'langs-editor-tr langs-editor-header'}, R.div({className:'langs-editor-th'}), langsIdsList.map((langId) => {
			return R.div({key:langId, className:'langs-editor-th'}, langId);
		}));
		
		idsList.some((id) => {
			let filter = this.state.filter;
			if(filter) {
				if(id.indexOf(filter) < 0) {
					if(langsIdsList.every(langId => languages[langId][id].toLowerCase().indexOf(filter) < 0)) {
						return;
					}
				}
			}

			lines.push(R.div({key: id, className:'langs-editor-tr'},
				R.div({className:'langs-editor-th selectable-text',
					title: "Ctrl+click to copy key, Double click to rename, Right click to delete",
					onContextMenu: (ev) => {
						sp(ev);
					},
					onMouseDown: (ev) => {
						let currentKey = ev.target.innerText;
						
						if(ev.buttons === 2) {
							return editor.ui.modal.showEditorQuestion('Translatable key delete', 'Delete key ' + currentKey + '?', () => {
								for(let id in languages) {
									let l = languages[id];
									delete l[currentKey];
								}
								onModified();
								refreshCachedData();
								this.forceUpdate();
							});
						}
						else if(ev.ctrlKey) {
							window.copyTextByClick(ev);
						}
						sp(ev);
					},
					onDoubleClick: (ev) => {
						let currentKey = ev.target.innerText;

						return editor.ui.modal.showPrompt("Translatable key rename:", currentKey, undefined, (nameToCheck) => {
							if(nameToCheck === currentKey) {
								return 'Please rename key.';
							}
							if(oneLanguageTable.hasOwnProperty(nameToCheck)) {
								return 'Key with that name already exists.';
							}
						}).then((newKey) => {
							if(newKey) {
								for(let id in languages) {
									let l = languages[id];
									l[newKey] = l[currentKey];
									delete l[currentKey];
								}
								onModified();
								refreshCachedData();
								this.forceUpdate();
							}
						});
					}
				}, id),
				langsIdsList.map((langId) => {
					let text = languages[langId][id];
					return R.div({key: langId, className:'langs-editor-td'}, R.textarea({defaultValue: text, id:texareaID(langId, id), onChange:(ev) => {
						languages[langId][id] = ev.target.value;
						onModified();
					}}));
				})
			));
		});

		if(!this.state.filter) {
			lines = Group.groupArray(lines, '.');
		}

		return R.div(langsEditorProps,
			R.btn('+ Add translatable KEY...', this.onAddNewKeyClick, undefined, 'main-btn'),
			R.btn('+ Add language...', this.onAddNewLanguageClick),
			R.input(this.searchInputProps),
			R.div(langsEditorWrapperProps, 
				header,
				R.div(tableBodyProps,
					lines
				)
			)
		);
	}
}

function refreshCachedData() {
	langsIdsList = Object.keys(languages);
	langsIdsList.sort((a, b) => {
		return (langIdPriority(a) > langIdPriority(b)) ? 1 : -1;
	});
	oneLanguageTable = languages[langsIdsList[0]];
	assert(oneLanguageTable, "No localization data loaded.");
	idsList = Object.keys(oneLanguageTable);
	let idsForDropdown = idsList;
	if(externalLangsData) {
		idsForDropdown = Object.keys(Object.assign({}, oneLanguageTable ,externalLangsData));
	}
	let a = [{name:'none', value:''}];
	for(let id of idsForDropdown) {
		a.push({name:id, value:id});
	}

	LanguageView._keysSelectableList = a;
}

window.makeTranslatableSelectEditablePropertyDecriptor = (name, important) => {
	return {
		name: name,
		type: String,
		important: important,
		isTranslatableKey: true,
		select: () => {
			return LanguageView._keysSelectableList;
		}
	};
};


let _outjump;
function onModified() {
	if(_outjump) {
		clearTimeout(_outjump);
	}
	
	_outjump = setTimeout(() => {
		L.fefreshAllTextEverywhere();
		for(let id in languages) {
			let content = L.__serializeLanguage(languages[id]);
			editor.fs.saveFile(editor.projectDesc.localesPath + '/' + id + '.json', content, true);
		}
		_outjump = null;
	}, 600);
}

function langIdPriority(l) {
	return l === 'en' ? ' ' : l;
}