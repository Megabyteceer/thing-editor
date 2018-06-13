const fieldEditorWrapperProps = {className:"field-editor-wrapper"};

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onEditClicked = this.onEditClicked.bind(this);
	}
	
	onEditClicked() {
		if(!this.props.disabled) {
			this.fieldNameToChoose = this.props.field.name;
			path = editor.selection[0][this.fieldNameToChoose];
			path = this.prepareCurrentPath(path);
			game.currentScene._refreshAllObjectRefs();
			
			this.chooseProperty(null);
		}
	}
	
	prepareCurrentPath(path) {
		return path;
	}
	
	isItTargetValue(val) {
		if (!val) return true;
		
		let type = typeof val;
		
		return ((type !== 'object') && (type !== 'function'));
	}
	
	finalValueChoosed(path) {
		this.applyFinalPath(path.join('.'));
	}
	
	applyFinalPath(path) {
		editor.onSelectedPropsChange(this.fieldNameToChoose, path);
	}
	
	isFieldGoodForCallbackChoose(fieldName, object) {
		if(fieldName.charCodeAt(0) === 95) {
			return false;
		}
		
		let val = object[fieldName];
		if(!val) {
			return true;
		}
		let type = typeof val;
		if(type === 'object' || type === 'function') {
			return !val.__EDITOR_isHiddenForChooser;
		}
		
		return true;
	}
	
	render() {
		return R.div(fieldEditorWrapperProps,
			R.input({className:'props-editor-callback', onChange: this.props.onChange, disabled:this.props.disabled, value: this.props.value || ''}),
			R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn')
		);
	}
	
	
	
	chooseProperty(parent) {
		if(!parent) {
			parent = {
				game,
				'this':editor.selection[0],
				all: game.currentScene.all
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
		
		if(parent.hasOwnProperty('parent') && parent.parent && parent.parent !== game.stage.parent) {
			items.push({pureName:'parent', name: R.b(null, 'parent')});
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
						items.push({pureName:name, name: R.b(null, name)});
						addedNames[name] = true;
					}
				}
			}
		}
		
		
		
		const addIfGood = (name) => {
			if (!addedNames.hasOwnProperty(name)) {
				if (this.isFieldGoodForCallbackChoose(name, parent)) {
					items.push({name});
					addedNames[name] = true;
				}
			}
		};
		
		//ignore names globally
		addedNames['constructor'] = true;
		
		if(typeof parent === 'object') {
			let needEnum = true;
			
			if(parent instanceof PIXI.DisplayObject) {
				['remove'].some(addIfGood);
				needEnum = false;
			}
			
			if(parent instanceof PIXI.Container) {
				['children', 'interactiveChildren', 'height', 'width'].some(addIfGood);
				needEnum = false;
			}
			
			if(needEnum) {
				for(let name in parent) {
					addIfGood(name);
				}
				
				for(let name of enumProps(parent)) {
					addIfGood(name);
				}
			}
		}
		
		editor.ui.modal.showListChoose('Path for ' + this.fieldNameToChoose + ': ' + path.join('.') + '.', items).then((selected) => {
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
				
				if(this.isItTargetValue(val)) {
					this.finalValueChoosed(path);
				} else {
					this.chooseProperty(val, path);
				}
			}
		});
	}
}

function enumProps(obj) {
	var p = [];
	for (; obj != null && obj !== Object.prototype; obj = Object.getPrototypeOf(obj)) {
	
		var op = Object.getOwnPropertyNames(obj);
		for (var i=0; i<op.length; i++)
			if (p.indexOf(op[i]) == -1)
				p.push(op[i]);
	}
	p.sort();
	return p;
}


let path;
const BACK_ITEM = {name:'↰'};
let parentsPath;

