import PropsFieldWrapper from "./props-field-wrapper.js";
import Lib from "thing-engine/js/lib.js";
import DisplayObject from "thing-engine/js/components/display-object.js";
import game from "thing-engine/js/game.js";
import CallbackEditor from "./callback-editor.js";

const fieldEditorWrapperProps = {className:"field-editor-wrapper"};
const selectableSceneNodeProps = {className:"selectable-scene-node"};

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onEditClicked = this.onEditClicked.bind(this);
	}

	static isFunctionIsClass(f) {
		return f.__EDITOR_propslist_cache;
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
		if(this.props.field.isValueValid && !this.props.field.isValueValid(val)) {
			return false;
		}

		if (!val) return true;

		let type = typeof val;
		
		return ((type !== 'object') && (type !== 'function' || CallbackEditor.isFunctionIsClass(val)));
	}
	
	finalValueChoosed(path) {
		this.applyFinalPath(path.join('.'));
	}
	
	applyFinalPath(path) {
		this.props.onChange(PropsFieldWrapper.surrogateChnageEvent(path));
	}
	
	isFieldGoodForCallbackChoose(fieldName, object, val) {
		if(fieldName.charCodeAt(0) === 95) {
			return false;
		}
		if(typeof val === 'undefined') {
			val = object[fieldName];
		}
		if(!val) {
			return true;
		}
		let type = typeof val;
		if(type === 'object' || (type === 'function')) {
			
			if(val instanceof DisplayObject && __getNodeExtendData(val).hidden) return false;
			
			return !val.__EDITOR_isHiddenForChooser;
		}
		
		return true;
	}
	
	render() {

		let val = this.props.value;

		return R.div(fieldEditorWrapperProps,
			R.input({className:'props-editor-callback', onChange: this.props.onChange, disabled:this.props.disabled, title:val, value: val || ''}),
			R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn')
		);
	}
	
	addAdditionalRoots(parent) {
		return parent;
	}

	chooseProperty(parent) {
		if(!parent) {
			parent = {
				game,
				'this':this.props.this || editor.selection[0],
				all: game.currentScene.all
			};
			parent['FlyText'] = Lib.getClass('FlyText');
			
			this.addAdditionalRoots(parent);
			
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
			if(o && (o instanceof DisplayObject) && this.isFieldGoodForCallbackChoose(name, parent, o)) {
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
		if((type === 'function') && CallbackEditor.isFunctionIsClass(parent)) {
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

		let acceptNowBtn;
		if(!this.props.field || !this.props.field.isValueValid || this.props.field.isValueValid(parent)) {
			acceptNowBtn = R.btn('✔', () => {
				this.finalValueChoosed(path);
				editor.ui.modal.hideModal();
			}, 'Use this path', 'main-btn');
		}

		editor.ui.modal.showListChoose(R.span(null, 'Path for ' + this.fieldNameToChoose + ': ' + path.join('.') + '.', acceptNowBtn), items).then((selected) => {
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
			if (p.indexOf(op[i]) === -1)
				p.push(op[i]);
	}
	
	let cc = o.constructor;
	
	let switched = false;

	for (; cc && CallbackEditor.isFunctionIsClass(cc) && cc !== Function && cc !== Object; cc = cc.__proto__) {
		
		if(cc.hasOwnProperty('__EDITOR_selectableProps')) {
			p = p.concat(cc.__EDITOR_selectableProps);
			switched = true;
		} else if(switched) {
			break;
		} else {
			let op = Object.getOwnPropertyNames(cc.prototype);
			for (let i=0; i<op.length; i++)
				if (p.indexOf(op[i]) === -1)
					p.push(op[i]);
		}
	}
	return p;
}


let path;
const BACK_ITEM = {name:'↰'};
let parentsPath;

