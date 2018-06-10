const fieldEditorWrapperProps = {className:"field-editor-wrapper"};

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onEditClicked = this.onEditClicked.bind(this);
	}
	
	onEditClicked() {
		if(!this.props.disabled) {
			fieldNameToChoose = this.props.field.name;
			chooseProperty(null, editor.selection[0][fieldNameToChoose]);
		}
	}
	
	render() {
		return R.div(fieldEditorWrapperProps,
			R.input({className:'props-editor-callback', onChange: this.props.onChange, disabled:this.props.disabled, value: this.props.value || ''}),
			R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn')
		);
	}
}

let fieldNameToChoose;
const BACK_ITEM = {name:'↰'};
let parentsPath;

function chooseProperty(parent, path) {
	if(!parent) {
		parent = {
			game,
			'this':editor.selection[0]
		};
		for(let c of editor.ClassesLoader.gameObjClasses.concat(editor.ClassesLoader.sceneClasses)) {
			c = c.c;
			
			let classPath = editor.ClassesLoader.getClassPath(c.name);
			if(classPath) {
				let engineEntryI = classPath.indexOf('engine/js/components');
				if(engineEntryI !== 0 && engineEntryI !== 1) {
					parent[c.name] = c;
				}
			}
		}
		
		
		if(path && typeof path === 'string') { //restore current path as default value
			parentsPath = [];
			path = path.split('.');
			let pathI;
			for(pathI = 0; (pathI < path.length-1); pathI++) {
				let itemName = path[pathI];
				let p;
				if(itemName.startsWith('#')) {
					p = parent.getChildByName(itemName.substr(1));
				} else {
					p = parent[itemName];
				}
				
				if(p) {
					parentsPath.push(parent);
					parent = p;
				} else {
					break;
				}
			}
			path.length = pathI;
		} else {
			parentsPath = [parent];
			path = [];
		}
		
	}
	
	let addedNames ={};
	let items = [];
	
	if(path.length > 0) {
		items.push(BACK_ITEM);
	}
	
	if(parent.hasOwnProperty('parent')) {
		items.push({pureName:'parent', name: R.b(null, 'parent')})
		addedNames['parent'] = true;
	}
	
	if(parent.hasOwnProperty('children') && Array.isArray(parent.children)) {
		for(let child of parent.children) {
			if(child.name) {
				items.push({child:child.name, name: R.span(null, 'childeren: ' ,R.b(null, child.name))});
			}
		}
	}
	
	if(parent.constructor) {
		let props = editor.enumObjectsProperties(parent);
		if(props && Array.isArray(props)) {
			for(let p of props) {
				if(p.type !== 'splitter') {
					let name = p.name;
					items.push({pureName:name, name: R.b(null, name)})
					addedNames[name] = true;
				}
			}
		}
	}
	
	for(let name of Object.keys(parent).filter(isFieldGoodForCallbackChoose)) {
		if(!addedNames.hasOwnProperty(name)) {
			items.push({name});
		}
	};
	
	editor.ui.modal.showListChoose('Path for ' + fieldNameToChoose + ': ' + path.join('.') + '.', items).then((selected) => {
		if(selected) {
			let val;
			if(selected === BACK_ITEM) {
				path.pop();
				val = parentsPath.pop();
			} else if(selected.child) {
				path.push('#' + selected.child);
				parentsPath.push(parent);
				val = parent.getChildByName(selected.child);
			} else {
				let name = selected.pureName || selected.name;
				path.push(name);
				parentsPath.push(parent);
				val = parent[name];
			}
			
			let type = typeof val;
			if(val && ((type === 'object') || (type === 'function' && editor.ClassesLoader.getClassPath(val.name)))) {
				chooseProperty(val, path)
			} else {
				editor.onSelectedPropsChange(fieldNameToChoose, path.join('.'));
			}
		}
	});
}

function isFieldGoodForCallbackChoose(fn) {
	return fn.indexOf('_') !== 0 && fn.indexOf('EDITOR_') !== 0;
}