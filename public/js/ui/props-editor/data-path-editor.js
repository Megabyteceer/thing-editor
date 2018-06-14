import PropsFieldWrapper from "./props-field-wrapper.js";

const fieldEditorWrapperProps = {className:"field-editor-wrapper"};
const selectableSceneNodeProps = {className:"selectable-scene-node"};

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onEditClicked = this.onEditClicked.bind(this);
	}
	
	onEditClicked() {
		if(!this.props.disabled) {
			this.fieldNameToChoose = this.props.title || this.props.field.name;
			path = this.props.value;
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
		
		return ((type !== 'object') && (type !== 'function' || !Lib.__hasClass(val.name) || (Lib.getClass(val.name) !== val)));
	}
	
	finalValueChoosed(path) {
		this.applyFinalPath(path.join('.'));
	}
	
	applyFinalPath(path) {
		this.props.onChange(PropsFieldWrapper.surrogateChnageEvent(path));
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
		if(type === 'object' || (type === 'function')) {
			
			if(val instanceof PIXI.DisplayObject && __getNodeExtendData(val).hidden) return false;
			
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
				'this':this.props.this || editor.selection[0],
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
		
		const addSceneNodeIfValid = (o, name, isChild) => {
			if(o && (o instanceof PIXI.DisplayObject) && this.isFieldGoodForCallbackChoose(name, parent)) {
				let item = {pureName: name, name: R.fragment(R.b(null, name + ' '), R.div(selectableSceneNodeProps, R.sceneNode(o)))};
				
				if(isChild) {
					item.child = name;
				} else {
					item.pureName = name;
				}
				
				items.push(item);
				addedNames[name] = true;
				return true;
			}
		};
		
		
		if(parent.hasOwnProperty('parent')) {
			addSceneNodeIfValid(parent.parent, 'parent');
		}
		
		if(parent.hasOwnProperty('children') && Array.isArray(parent.children)) {
			for(let child of parent.children) {
				if(child.name) {
					addSceneNodeIfValid(child, child.name, true);
				}
			}
		}

		const addIfGood = (name) => {
			if (!addedNames.hasOwnProperty(name)) {
				if (this.isFieldGoodForCallbackChoose(name, parent)) {
					if(!addSceneNodeIfValid(parent[name], name)) {
						items.push({name});
						addedNames[name] = true;
					}
				}
			}
		};
		
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
		
		//ignore names globally
		addedNames['constructor'] = true;
		let type = typeof parent;

		let needEnum = (type === 'object');
		if((type === 'function') && Lib.__hasClass(parent.name) && (Lib.getClass(parent.name) === parent)) {
			addedNames['prototype'] = true;
			addedNames['length'] = true;
			addedNames['name'] = true;
			needEnum = true;
		}

		 if(needEnum) {
			for(let name of enumProps(parent)) {
				addIfGood(name);
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

function enumProps(o) {
	
	
	if(o.hasOwnProperty('__EDITOR_selectableProps')) {
		return o.__EDITOR_selectableProps;
	}
	let p = [];
	
	if(!o.__EDITOR_noEnumSelfPropsForSelection) {
		let op = Object.getOwnPropertyNames(o);
		for (let i=0; i<op.length; i++)
			if (p.indexOf(op[i]) == -1)
				p.push(op[i]);
	}
	
	let cc = o.constructor;
	
	let switched = false;

	for (; cc != null && cc.prototype && cc !== Function && cc !== Object; cc = cc.__proto__) {
		
		if(cc.hasOwnProperty('__EDITOR_selectableProps')) {
			p = p.concat(cc.__EDITOR_selectableProps);
			switched = true;
		} else if(switched) {
			break;
		} else {
			let op = Object.getOwnPropertyNames(cc.prototype);
			for (let i=0; i<op.length; i++)
				if (p.indexOf(op[i]) == -1)
					p.push(op[i]);
		}
	}
	return p;
}


let path;
const BACK_ITEM = {name:'↰'};
let parentsPath;

