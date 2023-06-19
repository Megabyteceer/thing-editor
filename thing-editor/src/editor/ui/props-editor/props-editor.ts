import { Container } from "pixi.js";
import { ClassAttributes, Component, ComponentChild, ComponentType, h } from "preact";
import { KeyedMap, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyDesc, EditablePropertyType, propertyAssert } from "thing-editor/src/editor/props-editor/editable";
import Window from "thing-editor/src/editor/ui/editor-window";
import group, { GroupableItem } from "thing-editor/src/editor/ui/group";
import PropsFieldWrapper from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import Scene from "thing-editor/src/engine/lib/scene.c";

import fs, { AssetType } from "thing-editor/src/editor/fs";
import assetItemRendererPrefab from "thing-editor/src/editor/ui/assets-view/assets-view-prefab";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import BooleanEditor from "thing-editor/src/editor/ui/props-editor/props-editors/boolean-editor";
import BtnProperty from "thing-editor/src/editor/ui/props-editor/props-editors/btn-editor";
import CallbackEditor from "thing-editor/src/editor/ui/props-editor/props-editors/call-back-editor";
import "thing-editor/src/editor/ui/props-editor/props-editors/color-editor";
import ColorEditor from "thing-editor/src/editor/ui/props-editor/props-editors/color-editor";
import DataPathEditor from "thing-editor/src/editor/ui/props-editor/props-editors/data-path-editor";
import "thing-editor/src/editor/ui/props-editor/props-editors/number-editor";
import NumberEditor from "thing-editor/src/editor/ui/props-editor/props-editors/number-editor";
import { PowDampPresetEditor } from "thing-editor/src/editor/ui/props-editor/props-editors/pow-damp-preset-selector";
import RefFieldEditor from "thing-editor/src/editor/ui/props-editor/props-editors/refs-editor";
import "thing-editor/src/editor/ui/props-editor/props-editors/string-editor";
import StringEditor from "thing-editor/src/editor/ui/props-editor/props-editors/string-editor";
import TimelineEditor from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-editor";

import ImageEditor from "thing-editor/src/editor/ui/props-editor/props-editors/image-editor";
import PrefabPropertyEditor from "thing-editor/src/editor/ui/props-editor/props-editors/prefab-property-editor";
import SoundEditor from "thing-editor/src/editor/ui/props-editor/props-editors/sound-editor";
import getObjectDefaults from "thing-editor/src/editor/utils/get-prefab-defaults";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import scrollInToViewAndShake from "thing-editor/src/editor/utils/scroll-in-view";
import MovieClip from "thing-editor/src/engine/lib/movie-clip/movie-clip.c";

let editorProps = {
	className: 'props-editor window-scrollable-content',
	onscroll: (ev: Event) => {
		game.editor.settings.setItem('props-editor-scroll-y', (ev.target as HTMLDivElement).scrollTop);
	}
};

const prefabSelectCaret = R.span({ className: 'prefab-change-caret' }, '▾');

const headerProps = {
	className: 'props-header'
};

const MIXED_ICON = {
	__EDITOR_icon: 'tree/mixed-type'
};

const NOTHING_SELECTED = R.div({
	style: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%'
	}
}, 'Nothing selected');

interface PropsEditorProps extends ClassAttributes<PropsEditor> {

}

type EditablePropsRenderer = ComponentType<Component>;

const renderers: Map<EditablePropertyType, EditablePropsRenderer> = new Map();
const typeDefaults: Map<EditablePropertyType, any> = new Map();

class PropsEditor extends ComponentDebounced<PropsEditorProps> {

	editableProps: KeyedMap<boolean> = {};
	disableReasons: KeyedMap<string | undefined> = {};

	refs: Map<string, PropsFieldWrapper> = new Map();

	static registerRenderer(type: EditablePropertyType, render: any, def: any) {
		assert(!renderers.has(type), "Renderer for type '" + type + "' already defined.");
		renderers.set(type, render);
		typeDefaults.set(type, def);
	}

	static getRenderer(prop: EditablePropertyDesc): EditablePropsRenderer {
		propertyAssert(prop, renderers.has(prop.type), "Property with type '" + prop.type + "' has no renderer.");
		return renderers.get(prop.type) as EditablePropsRenderer;
	}

	static getDefaultForType(prop: EditablePropertyDesc): any {
		propertyAssert(prop, typeDefaults.has(prop.type), "Property with type '" + prop.type + "' has no default value.");
		return typeDefaults.get(prop.type);
	}

	restoreScrollPosInterval: number = 0;

	componentDidMount(): void {
		this.restoreScrollPosInterval = setInterval(() => {
			const div = (this.base as HTMLDivElement);
			if(div.querySelector('.props-group-__root-splitter')) {
				div.scrollTop = game.editor.settings.getItem('props-editor-scroll-y', 0);
				clearInterval(this.restoreScrollPosInterval);
				this.restoreScrollPosInterval = 0;
			}
		}, 10);
	}

	componentWillUnmount(): void {
		if(this.restoreScrollPosInterval) {
			clearInterval(this.restoreScrollPosInterval);
		}
	}

	onChangePrefabClick() {
		game.editor.choosePrefab('Select prefab', game.editor.selection[0].__nodeExtendData.isPrefabReference).then((selectedPrefabName) => {
			if(selectedPrefabName) {
				let newObjects = [];
				for(let o of game.editor.selection) {
					const objectData = Lib.__serializeObject(o);
					objectData.r = selectedPrefabName!;

					let newObject = Lib._deserializeObject(objectData);

					if((newObject instanceof MovieClip) && newObject._timelineData) {
						for(let animationField of newObject._timelineData.f) {
							const animationValue = animationField.t[0].v;
							if((newObject as KeyedObject)[animationField.n] !== animationValue) {
								(newObject as KeyedObject)[animationField.n] = animationValue;
								game.editor.ui.status.warn('Value of property "' + animationField.n + '" was changed to ' + animationValue + ' because its refers to MovieClip where property is animated.', 30018, newObject, animationField.n);
								game.editor.sceneModified();
							}
						}
					}

					Lib.__invalidateSerializationCache(o.parent);
					o.parent.addChildAt(newObject, o.parent.children.indexOf(o));
					o.remove();
					newObjects.push(newObject);
				}
				game.editor.selection.clearSelection();
				for(let o of newObjects) {
					game.editor.selection.add(o);
				}
				game.editor.refreshTreeViewAndPropertyEditor();
				game.editor.sceneModified(true);
			}
		});
	}

	onChangeClassClick() {
		let title;
		let isScene = game.editor.selection[0] instanceof Scene;
		if(isScene) {
			title = "Choose new scene type for current scene";
		} else {
			title = "Choose new type for " + game.editor.selection.length + " selected element";
			if(game.editor.selection.length > 1) {
				title += 's';
			}
		}
		game.editor.chooseClass(isScene, '_changeClass', title, (game.editor.selection[0].constructor as SourceMappedConstructor).__className).then((selectedClassName) => {
			if(selectedClassName) {
				const selectedClass = game.classes[selectedClassName];
				assert(selectedClass, "Class selection return wrong class name.");
				let a = game.editor.selection.slice(0);
				let selectionData = game.editor.selection.saveSelection();

				a.some((o) => {
					if((o.constructor as SourceMappedConstructor).__beforeChangeToThisType) {
						((o.constructor as SourceMappedConstructor).__beforeChangeToThisType as (o: Container) => void)(o);
					}
					o.constructor = selectedClass; // assign temporary fake constructor
					delete o.__nodeExtendData.unknownConstructor;
					delete o.__nodeExtendData.unknownConstructorProps;
					Lib.__invalidateSerializationCache(o);
				});

				let isDataOfScene = game.currentContainer instanceof Scene;
				let newSceneData = Lib.__serializeObject(game.currentContainer);

				a.some((o) => {
					assert(o.hasOwnProperty('constructor'), "");
					//@ts-ignore remove temporary fake constructor
					delete o.constructor;
				});
				game.__setCurrentContainerContent(Lib._deserializeObject(newSceneData, isDataOfScene));
				game.editor.selection.loadSelection(selectionData);
				game.editor.sceneModified(true);
			}
		});
	}

	selectField(fieldName: string, focus: boolean = false, selectAll: boolean = false) {
		let a = fieldName.split(',');

		let fn = a[0];
		/* TODO выбор через __view поле
		if(this.refs[fn]) {
			this.refs[fn].onAutoSelect(a);
		}*/

		setTimeout(() => {
			//TODO:  выбор поля через __view.base    всем ред полям, нодам, кейфреймам ltkfnm ccskre __view:ComponentChild
			let fldInput = document.querySelector(".props-editor #property-editor-" + fn.replace('.', '_')) as HTMLInputElement;
			if(!fldInput) {
				fldInput = document.querySelector(fieldName) as HTMLInputElement;
			}
			if(fldInput) {

				if(fn === fieldName) {
					Window.bringWindowForward(fldInput.closest('.window-body') as HTMLInputElement);
					scrollInToViewAndShake(fldInput);
				}

				if(focus || selectAll) {
					let input = fldInput.querySelector('input');
					if(input) {
						input.focus();
						if(selectAll) {
							input.select();
						}
					}
				}
			}
		}, 1);
	}

	render() {

		const visibleProps: KeyedMap<number> = {};
		this.editableProps = visibleProps as any as KeyedMap<boolean>;

		if(game.editor.selection.length <= 0) {
			return NOTHING_SELECTED;
		}
		const node = game.editor.selection[0];
		const Constructor = (node.constructor as SourceMappedConstructor);

		let props: EditablePropertyDesc[] = Constructor.__editableProps;


		let prefabReferencesPresent = false;
		let nonPrefabsPresent = false;

		for(let o of game.editor.selection) {
			if(o.__nodeExtendData.isPrefabReference) {
				prefabReferencesPresent = true;
			} else {
				nonPrefabsPresent = true;
			}
			let hidePropsEditor = o.__nodeExtendData.hidePropsEditor;
			if(hidePropsEditor && !hidePropsEditor.visibleFields) {
				return hidePropsEditor.title || 'Not editable';
			}
			let props = (o.constructor as SourceMappedConstructor).__editableProps;
			for(let p of props) {
				let name = p.name;
				if((!hidePropsEditor) || hidePropsEditor.visibleFields[name] || name === '__root-splitter') {
					visibleProps[name] = visibleProps.hasOwnProperty(name) ? (visibleProps[name] + 1) : 1;
				}
			}
		}
		props = props.filter((p) => {

			if(visibleProps[p.name] === game.editor.selection.length) {

				let propDisabled;
				if(node.__nodeExtendData.unknownConstructor) {
					propDisabled = "Can not edit unknown typed object. Fix type problem first.";
				} else if(node.__nodeExtendData.unknownPrefab) {
					propDisabled = "Can not edit reference to unknown prefab. Fix prefab problem first.";
				}

				if(!propDisabled) {
					propDisabled = (p.disabled && p.disabled(node)) ||
						(Constructor.__isPropertyDisabled && Constructor.__isPropertyDisabled!(p));
				}

				this.editableProps[p.name] = !propDisabled;
				this.disableReasons[p.name] = (typeof propDisabled === 'string') ? propDisabled : undefined;
				return true;
			} else {
				this.disableReasons[p.name] = "Not all selected objects have that property.";
				this.editableProps[p.name] = false;
			}
		});

		let groups: GroupableItem[] = [];
		let curGroup: GroupableItem | undefined;
		let curGroupArray: ComponentChild[] = [];

		const defaultValues = getObjectDefaults(node);

		for(let p of props) {
			if(p.visible) {
				let invisible;
				for(let o of game.editor.selection) {
					if(!p.visible(o)) { //TODO reset values at serialization only.

						const defaults = getObjectDefaults(o);
						(o as KeyedObject)[p.name] = defaults[p.name];
						invisible = true;
					}
				}

				if(invisible) {
					curGroupArray.push(
						R.div({ key: p.name })
					);
					continue;
				}
			}

			if(p.type === 'splitter') {
				if(curGroup) {
					groups.push(curGroup);
				}
				curGroupArray = [];
				curGroup = group.renderGroup({ key: p.name, content: curGroupArray, title: p.title as string });
			} else {
				curGroupArray.push(
					h(PropsFieldWrapper, { key: p.name, defaultValue: defaultValues[p.name], propsEditor: this, field: p, onChange: game.editor.onSelectedPropsChange })
				);
			}
		}
		assert(curGroup, "Properties list started not with splitter.");

		let header: ComponentChild;
		if(prefabReferencesPresent === nonPrefabsPresent) {
			header = "References and non references are selected."
		} else if(nonPrefabsPresent) {
			let classButtonContent;
			if(node.__nodeExtendData.unknownConstructor) {
				classButtonContent = R.fragment(R.classIcon(node.constructor as SourceMappedConstructor), ' ', R.b({
					className: 'danger selectable-text',
					title: 'Ctrl+click to copy Class`s name',
					onMouseDown: copyTextByClick
				}, node.__nodeExtendData.unknownConstructor));
			} else {
				let firstClass = node.constructor as SourceMappedConstructor;
				if(game.editor.selection.some((o) => {
					return o.constructor !== firstClass;
				})) {
					classButtonContent = R.fragment(R.classIcon(MIXED_ICON as SourceMappedConstructor), ' Mixed types selected', '...');
				} else {
					classButtonContent = R.fragment(R.classIcon(firstClass), ' ', R.b({
						className: 'selectable-text',
						title: 'Ctrl+click to copy Class`s name',
						onMouseDown: copyTextByClick
					}, firstClass.__className), '...');
				}
			}
			header = R.btn(classButtonContent, this.onChangeClassClick, 'Change objects Class', undefined, undefined, !game.__EDITOR_mode)
		} else {
			if(node.__nodeExtendData.unknownPrefab) {
				header = R.btn(R.fragment(
					node.__nodeExtendData.unknownPrefab,
					prefabSelectCaret
				), this.onChangePrefabClick, 'Change prefab referenced to', 'change-prefab-button danger', undefined, !game.__EDITOR_mode);
			} else {
				const prefabName = node.__nodeExtendData.isPrefabReference!;
				header = R.fragment(
					R.btn(R.fragment(
						assetItemRendererPrefab(fs.getFileByAssetName(prefabName, AssetType.PREFAB)),
						prefabSelectCaret
					), this.onChangePrefabClick, 'Change prefab referenced to', 'change-prefab-button', undefined, !game.__EDITOR_mode),
					R.btn('Edit prefab', () => {
						PrefabEditor.editPrefab(prefabName, true);
					}, undefined, undefined, { key: 'e', ctrlKey: true }, !game.__EDITOR_mode)
				)
			}
		}

		groups.push(curGroup as GroupableItem);
		return R.div(editorProps, R.div(headerProps, header), groups);
	}
}

export default PropsEditor;

PropsEditor.registerRenderer('color', ColorEditor, 0);
PropsEditor.registerRenderer('number', NumberEditor, 0);
PropsEditor.registerRenderer('string', StringEditor, null);
PropsEditor.registerRenderer('image', ImageEditor, null);
PropsEditor.registerRenderer('prefab', PrefabPropertyEditor, null);
PropsEditor.registerRenderer('sound', SoundEditor, null);
PropsEditor.registerRenderer('boolean', BooleanEditor, false);
PropsEditor.registerRenderer('btn', BtnProperty, undefined);
PropsEditor.registerRenderer('splitter', null, undefined);
PropsEditor.registerRenderer('ref', RefFieldEditor, undefined);
PropsEditor.registerRenderer('data-path', DataPathEditor, null);
PropsEditor.registerRenderer('callback', CallbackEditor, null);
PropsEditor.registerRenderer('timeline', TimelineEditor, null);
PropsEditor.registerRenderer('pow-damp-preset', PowDampPresetEditor, null);

