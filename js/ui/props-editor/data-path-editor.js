import PropsFieldWrapper from "./props-field-wrapper.js";
import Lib from "thing-engine/js/lib.js";
import DisplayObject from "thing-engine/js/components/display-object.js";
import game from "thing-engine/js/game.js";
import CallbackEditor from "./callback-editor.js";

const fieldEditorWrapperProps = {className:"field-editor-wrapper"};
const selectableSceneNodeProps = {className:"selectable-scene-node"};

let inited = false;

export default class DataPathEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onEditClicked = this.onEditClicked.bind(this);
		this.onBreakpointClick = this.onBreakpointClick.bind(this);
	}

	static isFunctionIsClass(f) {
		return f.prototype;
	}
	
	onBreakpointClick() {
		let node = editor.selection[0];
		node.___pathBreakpoint = this.props.value || node[this.props.field.name];
	}

	onEditClicked() {
		if(!this.props.disabled) {
			if(!inited) {
				initSelectableProps();
				inited = true;
			}
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
		editor.sheduleHistorySave();
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
			
			return !val.hasOwnProperty('__EDITOR_isHiddenForChooser');
		}
		
		return true;
	}
	
	render() {

		let val = this.props.value;

		let breakpointBtn;
		if(val) {
			breakpointBtn = R.btn('■', this.onBreakpointClick, 'Breakpoint', 'tool-btn breakpoint-btn');
		}

		return R.div(fieldEditorWrapperProps,
			R.input({className:'props-editor-callback', onChange: this.props.onChange, disabled:this.props.disabled, title:val, value: val || ''}),
			breakpointBtn,
			R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn')
		);
	}
	
	addAdditionalRoots(parent) {
		return parent;
	}

	chooseProperty(parent) {
		let noNeedSort = false;
		if(!parent) {
			noNeedSort = true;
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
				item.order = 100000;
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
						let order = 0;
						let isBold;
						try{
							order = parent[name].__EDITOR_ChooserOrder || 0;
							if(parent[name].__EDITOR_isGoodForChooser) {
								order += 100;
								isBold = true;
							}
						} catch(er){}// eslint-disable-line no-empty
						if(!isBold) {
							items.push({name});
						} else {
							items.push({pureName:name, name: R.b(null, name), order});
						}

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
						items.push({pureName:name, name: R.b(null, name), order: 10000});
						addedNames[name] = true;
					}
				}
			}
		}
		
		//ignore names globally
		addedNames['constructor'] = true;
		addedNames['prototype'] = true;
		let type = typeof parent;

		if(type === 'object' || type === 'function') {
			let props = enumProps(parent);
			if(!noNeedSort) {
				props.sort();
			}
			for(let name of props) {
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
		items.sort((a, b) => {
			return (b.order || 0) - (a.order || 0);
		});
		editor.ui.modal.showListChoose(R.span(null, 'Path for ' + this.fieldNameToChoose + ': ' + path.join('.') + '.', acceptNowBtn),
			items).then((selected) => {
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

function initSelectableProps() {
	let tmpSprite = new PIXI.Sprite();
	let spriteProps = enumProps(tmpSprite);
	for(let p of spriteProps) {
		if(!p.startsWith('_')) {
			let v = tmpSprite[p];
			if((typeof v) === 'function') {
				hidePropertyFromEnumerationForChooser(v);
			}
		}
	}
	unhidePropertyFromEnumerationForChooser(tmpSprite.remove);
}

let path;
const BACK_ITEM = {name:'↰', order: 10000000};
let parentsPath;

let enumed;

const hiddenProps = new WeakMap();

const hidePropertyFromEnumerationForChooser = (p) => {
	hiddenProps.set(p, true);
};
const unhidePropertyFromEnumerationForChooser = (p) => {
	hiddenProps.delete(p);
};

const enumSub = (o) => {
	let op = Object.getOwnPropertyNames(o);
	for (let name of op) {
		if(!name.startsWith('_')) {
			try {
				if(hiddenProps.has(o[name])) {
					continue;
				}
			} catch (er) {} // eslint-disable-line

			if (enumed.indexOf(name) === -1) {
				enumed.push(name);
			}
		}
	}
};

function enumProps(o) {
	enumed = [];
	enumSub(o);
	let cc = o.constructor;
	for (; cc && (cc !== Function) && (cc !== Object); (cc = cc.__proto__)) {
		let p = cc.prototype;
		if(p) {
			enumSub(p);
		}
	}
	return enumed;
}

	