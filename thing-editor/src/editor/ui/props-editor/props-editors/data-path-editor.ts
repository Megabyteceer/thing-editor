import { Container, DisplayObject, Sprite } from "pixi.js";
import { Component, ComponentChild, render } from "preact";
import { KeyedObject, SelectableProperty, SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import CallbackEditor from "thing-editor/src/editor/ui/props-editor/props-editors/call-back-editor";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { getAllObjectRefsCount } from "thing-editor/src/editor/utils/scene-all-validator";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import callByPath from "thing-editor/src/engine/utils/call-by-path";
import getValueByPath, { getLatestSceneNodeBypath } from "thing-editor/src/engine/utils/get-value-by-path";

const fieldEditorWrapperProps = { className: "field-editor-wrapper" };
const selectableSceneNodeProps = { className: "selectable-scene-node" };
const functionTipProps = { className: "path-editor-function-tip" };

let initialized = false;

const dataPathTipContainer = window.document.createElement('div');

let tipSyncInterval = 0;
const syncTip = () => {
	if(document.activeElement) {
		let bounds = document.activeElement.getBoundingClientRect();
		dataPathTipContainer.style.left = (bounds.x - 2) + 'px';
		dataPathTipContainer.style.top = (bounds.y - 27) + 'px';
	}
}

const startTipSync = (enabled: any = false) => {
	if(enabled) {
		if(!tipSyncInterval) {
			tipSyncInterval = setInterval(syncTip, 50);
		}
	} else {
		if(tipSyncInterval) {
			clearInterval(tipSyncInterval);
			tipSyncInterval = 0;
		}
	}
}

dataPathTipContainer.id = 'data-path-tip-container';
window.document.body.appendChild(dataPathTipContainer);

interface DataPathEditorProps extends Omit<EditablePropertyEditorProps, "field"> {
	field?: EditablePropertyDesc;
	title: string;
}

interface DataPathEditorState {
	focus: boolean;

}

interface DataPathSelectItem {
	order?: number;
	noFilter?: boolean;
	name: ComponentChild;
	pureName?: string;
	nameOfChild?: string;
	refusedBecause?: string;
}

export default class DataPathEditor extends Component<DataPathEditorProps, DataPathEditorState> {

	itIsCallbackEditor = false;

	constructor(props: DataPathEditorProps) {
		super(props);

		if(this.props.field) {
			this.props.field.notAnimate = true;
		}
		this.onEditClicked = this.onEditClicked.bind(this);
		this.onBreakpointClick = this.onBreakpointClick.bind(this);
		this.onGotoTargetClick = this.onGotoTargetClick.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onBlur = this.onBlur.bind(this);
	}

	onFocus() {
		this.setState({ focus: true });
	}

	onBlur() {
		//this.setState({ focus: false });
	}

	static isFunctionIsClass(f: () => any) {
		return f.name && (f.name[0] !== f.name.toLowerCase()[0]);
	}

	onGotoTargetClick() {

		if(this.props.value && this.props.value.startsWith('Sound.play')) {
			callByPath(this.props.value, game.editor.selection[0]);
			return;
		}

		game.currentScene._refreshAllObjectRefs();
		let node = getLatestSceneNodeBypath(this.props.value, game.editor.selection[0]);
		if(!node) {
			return;
		}
		if(node.getRootContainer() !== game.currentContainer) {
			PrefabEditor.exitPrefabEdit();
		}

		if(node.getRootContainer() !== game.currentContainer) {
			game.editor.ui.modal.notify('Target object is not in current container to be selected.');
		} else {
			game.editor.ui.sceneTree.selectInTree(node);
		}
	}

	onBreakpointClick() {
		let node = game.editor.selection[0];
		node.__nodeExtendData.__pathBreakpoint = this.props.value || (node as KeyedObject)[this.props.field!.name];
	}

	onEditClicked() {
		if(!this.props.disabled) {
			if(!initialized) {
				initSelectableProps();
				initialized = true;
			}
			game.currentScene._refreshAllObjectRefs();

			this.startChoosing();
		}
	}

	startChoosing() {
		game.editor.currentPathChoosingField = this.props.field!;

		let path: string[];
		let parent: KeyedObject = game;
		_rootParent = parent;
		if(this.props.value) {
			path = this.cleanupPath(this.props.value as string).split('.');
			parentsPath = [];
			let pathI;
			for(pathI = 0; (pathI < path.length - 1); pathI++) {
				let itemName = path[pathI];
				let p: KeyedObject;
				if((itemName === 'this') && (pathI === 0)) {
					p = game.editor.selection[0];
				} else if(itemName.startsWith('#')) {
					p = (parent as Container).getChildByName(itemName.substr(1)) as KeyedObject;
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

		this.chooseProperty(parent, path);
	}

	cleanupPath(path: string): string {
		return path;
	}

	isItTargetValue(val: any) {
		if(this.props.field!.isValueValid && !this.props.field!.isValueValid(val)) {
			return false;
		}

		if(!val) return true;

		let type = typeof val;

		return ((type !== 'object') && (type !== 'function' || !CallbackEditor.isFunctionIsClass(val)));
	}

	finalValueChoosed(path: string[], _val: any, _parent: any) {
		this.applyFinalPath(path.join('.'));
	}

	applyFinalPath(path: string) {
		this.props.onChange(path);
		game.editor.history.scheduleHistorySave();
	}

	isFieldGoodForCallbackChoose(fieldName: string, object: KeyedObject, val?: SelectableProperty, isChild = false) {
		EDITOR_FLAGS.rememberTryTime();
		try {
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

				if(isChild && val instanceof DisplayObject && val.__nodeExtendData.hidden) {
					return false;
				}

				return !(val as SelectableProperty).___EDITOR_isHiddenForChooser &&
					(this.itIsCallbackEditor || !(val as SelectableProperty).___EDITOR_isHiddenForDataChooser);
			}

			return true;
		} catch(er) {
			EDITOR_FLAGS.checkTryTime();
		}
	}

	get chooseButtonTip() {
		return 'Choose data source';
	}

	render() {

		let val = this.props.value;

		let breakpointBtn;
		if(val && !game.__EDITOR_mode) {
			breakpointBtn = R.btn('■', this.onBreakpointClick, 'Breakpoint', 'tool-btn breakpoint-btn');
		}
		let chooseBtn;
		if(game.__EDITOR_mode) {
			chooseBtn = R.btn('...', this.onEditClicked, this.chooseButtonTip, 'tool-btn');
		}

		let gotoButton;
		if(val) {
			gotoButton = R.btn('➥', this.onGotoTargetClick, 'Find target object', 'tool-btn');
		}

		let functionTip;
		if(val && this.state && this.state.focus) {
			game.currentScene._refreshAllObjectRefs();
			let f;
			try {
				f = getValueByPath(val, game.editor.selection[0], true);
			} catch(er) { }// eslint-disable-line no-empty

			if(typeof f === 'function') {
				let firstLine = f.toString().split('\n').shift();
				let params = firstLine.split('(').pop().split(')').shift();
				if(!params) {
					params = 'no parameters';
				}
				functionTip = R.span(functionTipProps, params);
			}
		}

		render(functionTip, dataPathTipContainer);
		startTipSync(functionTip as any);

		return R.div(fieldEditorWrapperProps,
			R.input({
				className: 'props-editor-callback',
				onInput: this.props.onChange,
				disabled: this.props.disabled,
				title: val,
				value: val || '',
				onFocus: this.onFocus,
				onBlur: this.onBlur
			}),
			breakpointBtn,
			chooseBtn,
			gotoButton
		);
	}

	chooseProperty(parent: KeyedObject, path: string[]) {

		let addedNames: Set<string> = new Set();

		let items: DataPathSelectItem[] = [];

		const addSceneNodeIfValid = (o: Container, pureName: string, isChild = false, order = 100000) => {
			if(o && (o instanceof DisplayObject) && this.isFieldGoodForCallbackChoose(pureName, parent, o, isChild)) {
				let item: DataPathSelectItem = {
					order,
					pureName,
					name: R.fragment(
						R.b(null, pureName + ' '),
						R.div(selectableSceneNodeProps, R.sceneNode(o))
					)
				};

				if(isChild) {
					items.forEach(i => {
						if(i.nameOfChild === pureName) {
							item.refusedBecause = i.refusedBecause = "Refused because more that one object with that name present in container";
						}
					});
					item.nameOfChild = pureName;
				} else {
					item.pureName = pureName;
				}

				if(parent === game.currentScene.all) {
					let refuse = getAllObjectRefsCount((o as Container).name!);
					if(refuse) {
						item.refusedBecause = refuse;
					}
				}

				items.push(item);
				addedNames.add(pureName);
				return true;
			}
		};


		if(path.length === 0) {
			addSceneNodeIfValid(game.editor.selection[0], 'this', false, 1000000);
		}


		//ignore names globally
		addedNames.add('constructor');
		addedNames.add('prototype');
		addedNames.add('tempDisplayObjectParent');
		if(parent instanceof DisplayObject) {
			addedNames.add('init');
			addedNames.add('update');
			addedNames.add('onRemove');
		}
		let topPathElement = path[path.length - 1];
		if(topPathElement && topPathElement.startsWith('#')) {
			addedNames.add('parent'); // prevent to go from parent to child and back
		}

		if(path.length > 0) {
			items.push(BACK_ITEM);
		}


		if(parent.hasOwnProperty('parent') && !addedNames.hasOwnProperty('parent')) {
			addSceneNodeIfValid(parent.parent, 'parent');
		}

		if(parent.hasOwnProperty('children') && Array.isArray(parent.children)) {
			for(let child of parent.children) {
				if(child.name) {
					addSceneNodeIfValid(child, child.name, true);
				}
			}
		}

		const addIfGood = (name: string) => {
			if(!addedNames.has(name)) {
				Lib.__outdatedReferencesDetectionDisabled = true;
				if(this.isFieldGoodForCallbackChoose(name, parent)) {
					if(!addSceneNodeIfValid(parent[name], name)) {
						let order = 0;
						let isBold;
						EDITOR_FLAGS.rememberTryTime();
						try {
							let val = parent[name];
							order = val.___EDITOR_ChooserOrder || 0;
							if(val.___EDITOR_isGoodForChooser || (this.itIsCallbackEditor && val.___EDITOR_isGoodForCallbackChooser) || val === game.data) {
								order += 100;
								isBold = true;
							}
						} catch(er) {// eslin t-disable-line no-empty
							EDITOR_FLAGS.checkTryTime();
						}
						if(!isBold) {
							items.push({ name });
						} else {
							items.push({ pureName: name, name: R.b(null, name), order });
						}

						addedNames.add(name);
					}
				}
				Lib.__outdatedReferencesDetectionDisabled = false;
			}
		};

		if(parent.constructor && !this.itIsCallbackEditor) {
			let props = (parent.constructor as SourceMappedConstructor).__editableProps;
			if(props && Array.isArray(props)) {
				for(let p of props) {
					if(p.type !== 'splitter') {
						let name = p.name;
						items.push({ pureName: name, name: R.b(null, name), order: 10000 });
						addedNames.add(name);
					}
				}
			}
		}


		let type = typeof parent;

		if(type === 'object' || type === 'function') {
			let props = enumProps(parent);
			if(parent !== _rootParent) {
				props.sort();
			}
			for(let name of props) {
				if(type === 'function') {
					if(name === 'length' || name === 'name') {
						continue;
					}
				}
				addIfGood(name);
			}
		}

		let acceptNowBtn;
		if(!this.props.field || !this.props.field.isValueValid || this.props.field.isValueValid(parent)) {
			acceptNowBtn = R.btn('✔', () => {
				this.finalValueChoosed(path, parent, parentsPath[parentsPath.length - 1]);
				game.editor.ui.modal.hideModal();
			}, 'Use this path', 'main-btn');
		}
		items.sort((a, b) => {
			return (b.order || 0) - (a.order || 0);
		});
		game.editor.ui.modal.showListChoose(
			R.span(null,
				'Path for ' + (this.props.title || this.props.field!.name) + ': ' + path.join('.') + '.',
				R.br(),
				(parent instanceof DisplayObject) ? R.sceneNode(parent as Container) : undefined,
				acceptNowBtn
			),
			items)
			.then((selected) => {
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
						if(name === 'this') {
							val = game.editor.selection[0];
						} else {
							val = parent[name];
						}
					}

					if(this.isItTargetValue(val)) {
						this.finalValueChoosed(path, val, parent);
					} else {
						this.chooseProperty(val, path);
					}
				}
			});
	}
}

function initSelectableProps() {
	let tmpSprite = new Sprite() as KeyedObject;
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
	unhidePropertyFromEnumerationForChooser(tmpSprite.gotoLabelRecursive);
}

const BACK_ITEM = { name: '↰', noFilter: true, order: 10000000 };
let parentsPath: KeyedObject[];

const hiddenProps = new WeakMap();

const hidePropertyFromEnumerationForChooser = (p: any) => {
	hiddenProps.set(p, true);
};
const unhidePropertyFromEnumerationForChooser = (p: any) => {
	hiddenProps.delete(p);
};

let enumeratedProps: string[];

const enumSub = (o: KeyedObject) => {
	let op = Object.getOwnPropertyNames(o);
	for(let name of op) {
		if(!name.startsWith('_')) {
			EDITOR_FLAGS.rememberTryTime();
			try {
				if(hiddenProps.has(o[name])) {
					continue;
				}
			} catch(er) { // eslint-disable-line
				EDITOR_FLAGS.checkTryTime();
			}

			if(enumeratedProps.indexOf(name) === -1) {
				enumeratedProps.push(name);
			}
		}
	}
};

let _rootParent: KeyedObject;

function enumProps(o: KeyedObject) {
	Lib.__outdatedReferencesDetectionDisabled = true;
	enumeratedProps = [];
	enumSub(o);
	let cc = o.constructor;
	for(; cc && (cc !== Function) && (cc !== Object);
		//@ts-ignore
		(cc = cc.__proto__)) {

		let p = cc.prototype;
		if(p) {
			enumSub(p);
		}
	}
	Lib.__outdatedReferencesDetectionDisabled = false;
	return enumeratedProps;
}


export type { DataPathEditorProps, DataPathEditorState };
