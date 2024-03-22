import { Container, DisplayObject } from 'pixi.js';
import type { ComponentChild } from 'preact';
import { Component, render } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import CallbackEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/call-back-editor';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import { getAllObjectRefsCount } from 'thing-editor/src/editor/utils/scene-all-validator';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath, { getLatestSceneNodeBypath } from 'thing-editor/src/engine/utils/get-value-by-path';

const fieldEditorWrapperProps = { className: 'field-editor-wrapper' };
const selectableSceneNodeProps = { className: 'selectable-scene-node' };
const functionTipProps = { className: 'path-editor-function-tip' };

let initialized = false;

const filteredNamesInDisplayObject = new Set([
	'_tempDisplayObjectParent',
	'__sourceCode',
	'_bounds',
	'_events',
	'_onDisableByTrigger',
	'_tintColor',
]);

let tipSyncInterval = 0;
const syncTip = () => {
	if (document.activeElement) {
		let bounds = document.activeElement.getBoundingClientRect();
		dataPathTipContainer.style.left = (bounds.x - 2) + 'px';
		dataPathTipContainer.style.top = (bounds.y - 27) + 'px';
	}
};

const startTipSync = (enabled: any = false) => {
	if (enabled) {
		if (!tipSyncInterval) {
			tipSyncInterval = window.setInterval(syncTip, 50);
		}
	} else {
		if (tipSyncInterval) {
			clearInterval(tipSyncInterval);
			tipSyncInterval = 0;
		}
	}
};

const dataPathTipContainer = window.document.createElement('div');
dataPathTipContainer.id = 'data-path-tip-container';
window.document.body.appendChild(dataPathTipContainer);

interface DataPathEditorProps extends Omit<EditablePropertyEditorProps, 'field'> {
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
		this.onEditClicked = this.onEditClicked.bind(this);
		this.onBreakpointClick = this.onBreakpointClick.bind(this);
		this.refreshTip = this.refreshTip.bind(this);
		this.onGotoTargetClick = this.onGotoTargetClick.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onBlur = this.onBlur.bind(this);
	}

	onFocus() {
		this.setState({ focus: true });
	}

	onBlur() {
		this.setState({ focus: false });
		this.hideParamsTip();
	}

	static isFunctionIsClass(f: () => any) {
		return f.toString().startsWith('class ');
	}

	onGotoTargetClick() {

		if (this.props.value && this.props.value.startsWith('Sound.play')) {
			callByPath(this.props.value, game.editor.selection[0]);
			return;
		}

		game.currentScene._refreshAllObjectRefs();
		let node = getLatestSceneNodeBypath(this.props.value, game.editor.selection[0]);
		if (!node) {
			return;
		}
		if (node.getRootContainer() !== game.currentContainer) {
			PrefabEditor.exitPrefabEdit();
		}
		game.editor.ui.sceneTree.selectInTree(node);
	}

	onBreakpointClick() {
		let node = game.editor.selection[0];
		node.__nodeExtendData.__pathBreakpoint = this.props.value || (node as KeyedObject)[this.props.field!.name];
	}

	onEditClicked() {
		if (!this.props.disabled) {
			if (!initialized) {
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
		if (this.props.value) {
			path = this.cleanupPath(this.props.value as string).split('.');
			parentsPath = [];
			let pathI;
			for (pathI = 0; (pathI < path.length - 1); pathI++) {
				let itemName = path[pathI];
				let p: KeyedObject;
				if ((itemName === 'this') && (pathI === 0)) {
					p = game.editor.selection[0];
				} else if (itemName.startsWith('#')) {
					p = (parent as Container).getChildByName(itemName.substr(1)) as KeyedObject;
				} else {
					p = parent[itemName];
				}
				if (p) {
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
		if (this.props.field!.isValueValid && !this.props.field!.isValueValid(val)) {
			return false;
		}

		if (!val) return true;

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
			if (filteredNamesInDisplayObject.has(fieldName) && object instanceof Container) {
				EDITOR_FLAGS.checkTryTime();
				return false;
			}
			if (fieldName.startsWith('_') && object[fieldName.replace(/^_+/, '')]) {
				EDITOR_FLAGS.checkTryTime();
				return false;
			}
			if (typeof val === 'undefined') {
				val = object[fieldName];
			}
			if (!val) {
				EDITOR_FLAGS.checkTryTime();
				return true;
			}
			let type = typeof val;
			if (type === 'object' || (type === 'function')) {

				if (isChild && val instanceof DisplayObject && val.__nodeExtendData.hidden) {
					EDITOR_FLAGS.checkTryTime();
					return false;
				}
				EDITOR_FLAGS.checkTryTime();
				return !(val as SelectableProperty).___EDITOR_isHiddenForChooser &&
					(this.itIsCallbackEditor || !(val as SelectableProperty).___EDITOR_isHiddenForDataChooser);
			}
			EDITOR_FLAGS.checkTryTime();
			return true;
		} catch (_er) { /* empty */ }
		EDITOR_FLAGS.checkTryTime();
	}

	get chooseButtonTip() {
		return 'Choose data source';
	}

	interval = 0;

	componentDidMount(): void {
		this.interval = window.setInterval(this.refreshTip, 50);
	}

	componentWillUnmount(): void {
		this.hideParamsTip();
		clearInterval(this.interval);
	}

	refreshTip() {
		if (!this.state || !this.state.focus || !game.editor.selection.length || !game.currentScene) {
			return;
		}
		let val = this.props.value;
		if (val) {
			game.currentScene._refreshAllObjectRefs();
			let f;
			try {
				f = getValueByPath(val, game.editor.selection[0], true);
			} catch (_er) { }

			if (typeof f === 'function') {
				let paramsView: ComponentChild;
				let firstLine = f.toString().split('\n').shift();
				let params: string[] = firstLine.split('(').pop().split(')').shift().split(', ').filter((p: string) => p);
				if (!params.length) {
					paramsView = 'no parameters';
				} else {
					let paramsW: Array<ComponentChild> = [];

					let cursorPos = ((this.base as HTMLDivElement).querySelector('input') as HTMLInputElement).selectionStart || 0;
					let selectedParamIndex = -1;
					let paramsStartVal = val.indexOf(',');
					if (paramsStartVal > 0 && cursorPos > paramsStartVal) {
						selectedParamIndex = 0;
						let leftPart = val.substr(0, cursorPos);
						let a = leftPart.split(',');
						if (a.length > 1) {
							selectedParamIndex = a.length - 2;
						}
					}

					let paramIndex = 0;
					for (let param of params) {
						if (param) {
							if (paramsW.length) {
								paramsW.push(', ');
							}
							if (paramIndex === selectedParamIndex) {
								paramsW.push(R.b(null, param));
							} else {
								paramsW.push(param);
							}
							paramIndex++;
						}
					}
					paramsView = paramsW;
				}
				render(R.span(functionTipProps, paramsView), dataPathTipContainer);
				startTipSync(true);
				return;
			}
			this.hideParamsTip();
		}
	}

	hideParamsTip() {
		render(undefined, dataPathTipContainer);
		startTipSync();
	}

	render() {

		let val = this.props.value;

		let breakpointBtn;
		if (val && !game.__EDITOR_mode) {
			breakpointBtn = R.btn('■', this.onBreakpointClick, 'Breakpoint', 'tool-btn breakpoint-btn');
		}
		let chooseBtn;
		if (game.__EDITOR_mode) {
			chooseBtn = R.btn('...', this.onEditClicked, this.chooseButtonTip, 'tool-btn');
		}

		let gotoButton;
		if (val) {
			gotoButton = R.btn('➥', this.onGotoTargetClick, 'Find target object', 'tool-btn');
		}

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
			if (o && (o instanceof DisplayObject) && this.isFieldGoodForCallbackChoose(pureName, parent, o, isChild)) {
				let item: DataPathSelectItem = {
					order,
					pureName,
					name: R.fragment(
						R.b(null, pureName + ' '),
						R.div(selectableSceneNodeProps, R.sceneNode(o))
					)
				};

				if (isChild) {
					items.forEach(i => {
						if (i.nameOfChild === pureName) {
							item.refusedBecause = i.refusedBecause = 'Refused because more that one object with that name present in container';
						}
					});
					item.nameOfChild = pureName;
				} else {
					item.pureName = pureName;
				}

				if (parent === game.currentScene.all) {
					let refuse = getAllObjectRefsCount((o as Container).name!);
					if (refuse) {
						item.refusedBecause = refuse;
					}
				}

				items.push(item);
				addedNames.add(pureName);
				return true;
			}
		};


		if (path.length === 0) {
			addSceneNodeIfValid(game.editor.selection[0], 'this', false, 1000000);
		}


		//ignore names globally
		addedNames.add('constructor');
		addedNames.add('prototype');
		addedNames.add('tempDisplayObjectParent');
		if (parent instanceof DisplayObject) {
			addedNames.add('init');
			addedNames.add('update');
			addedNames.add('onRemove');
		}
		let topPathElement = path[path.length - 1];
		if (topPathElement && topPathElement.startsWith('#')) {
			addedNames.add('parent'); // prevent to go from parent to child and back
		}

		if (path.length > 0) {
			items.push(BACK_ITEM);
		}


		if (parent.hasOwnProperty('parent') && !addedNames.hasOwnProperty('parent')) {
			addSceneNodeIfValid(parent.parent, 'parent');
		}

		if (parent.hasOwnProperty('children') && Array.isArray(parent.children)) {
			for (let child of parent.children) {
				if (child.name) {
					addSceneNodeIfValid(child, child.name, true);
				}
			}
		}

		const addIfGood = (name: string) => {
			if (!addedNames.has(name)) {
				Lib.__outdatedReferencesDetectionDisabled = true;
				if (this.isFieldGoodForCallbackChoose(name, parent)) {
					if (!addSceneNodeIfValid(parent[name], name)) {
						let order = 0;
						let isBold;
						EDITOR_FLAGS.rememberTryTime();
						try {
							let val = parent[name];
							order = val.___EDITOR_ChooserOrder || 0;
							if (val.___EDITOR_isGoodForChooser || (this.itIsCallbackEditor && val.___EDITOR_isGoodForCallbackChooser) || val === game.data) {
								order += 100;
								isBold = true;
							}
						} catch (_er) { /* empty */ }
						EDITOR_FLAGS.checkTryTime();
						if (!isBold) {
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

		if (parent.constructor && !this.itIsCallbackEditor) {
			let props = (parent.constructor as SourceMappedConstructor).__editableProps;
			if (props && Array.isArray(props)) {
				for (let p of props as EditablePropertyDesc[]) {
					if (!p.notSerializable) {
						let name = p.name;
						items.push({ pureName: name, name: R.b(null, name), order: 10000 });
						addedNames.add(name);
					}
				}
			}
		}


		let type = typeof parent;

		if (type === 'object' || type === 'function') {
			let props = enumProps(parent);
			if (parent !== _rootParent) {
				props.sort();
			}
			let a = props.slice();
			props = [];
			a = a.filter((p) => {
				if (!p.startsWith('_')) {
					props.push(p);
					return false;
				}
				return true;
			});
			a = a.filter((p) => {
				if (!p.startsWith('__')) {
					props.push(p);
					return false;
				}
				return true;
			});
			props = props.concat(a);

			for (let name of props) {
				if (type === 'function') {
					if (name === 'length' || name === 'name') {
						continue;
					}
				}
				addIfGood(name);
			}
		}

		let acceptNowBtn;
		if (!this.props.field || !this.props.field.isValueValid || this.props.field.isValueValid(parent)) {
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
			.then((selected: DataPathSelectItem) => {
				if (selected) {
					let val;
					if (selected === BACK_ITEM) {
						path.pop();
						val = parentsPath.pop();
					} else if (selected.nameOfChild) {
						path.push('#' + selected.nameOfChild);
						parentsPath.push(parent);
						val = parent.getChildByName(selected.nameOfChild);
					} else {
						let name = (selected.pureName || selected.name) as string;
						path.push(name);
						parentsPath.push(parent);
						if (name === 'this') {
							val = game.editor.selection[0];
						} else {
							val = parent[name];
						}
					}

					if (this.isItTargetValue(val)) {
						this.finalValueChoosed(path, val, parent);
					} else {
						this.chooseProperty(val, path);
					}
				}
			});
	}
}

function initSelectableProps() {
	let tmpSprite = Lib._loadClassInstanceById('Sprite') as KeyedObject;
	let spriteProps = enumProps(tmpSprite);
	for (let p of spriteProps) {
		let v = tmpSprite[p];
		if ((typeof v) === 'function') {
			hidePropertyFromEnumerationForChooser(v);
		}
	}
	unhidePropertyFromEnumerationForChooser(tmpSprite.remove);
	unhidePropertyFromEnumerationForChooser(tmpSprite.gotoLabelRecursive);
}

const BACK_ITEM = { name: '↰', noFilter: true, noAutoSelect: true, order: 10000000 };
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
	for (let name of op) {
		EDITOR_FLAGS.rememberTryTime();
		try {
			if (hiddenProps.has(o[name])) {
				EDITOR_FLAGS.checkTryTime();
				continue;
			}
		} catch (_er) { /* empty */ }
		EDITOR_FLAGS.checkTryTime();
		if (enumeratedProps.indexOf(name) === -1) {
			enumeratedProps.push(name);
		}
	}
};

let _rootParent: KeyedObject;
const referenceContainer = new Container() as KeyedObject;

function enumProps(o: KeyedObject) {
	Lib.__outdatedReferencesDetectionDisabled = true;
	enumeratedProps = [];
	enumSub(o);
	let cc = o.constructor;
	for (; cc && (cc !== Function) && (cc !== Object);

		(cc = (cc as any).__proto__)) {

		let p = cc.prototype;
		if (p) {
			enumSub(p);
		}
	}
	Lib.__outdatedReferencesDetectionDisabled = false;

	if (o instanceof Container) {
		enumeratedProps = enumeratedProps.filter((prop) => {
			if (referenceContainer[prop] !== null) {
				return true;
			}
		});

	}
	return enumeratedProps;
}


export type { DataPathEditorProps, DataPathEditorState };
