import { Container, MIPMAP_MODES, Point, Sprite, WRAP_MODES } from 'pixi.js';
import R, { renderClass } from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDescRaw } from 'thing-editor/src/editor/props-editor/editable';
import DataPathFixer from 'thing-editor/src/editor/utils/data-path-fixer';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import exportAsPng from 'thing-editor/src/editor/utils/export-as-png';
import getParentWhichHideChildren from 'thing-editor/src/editor/utils/get-parent-with-hidden-children';
import increaseNumberInName from 'thing-editor/src/editor/utils/increase-number-in-name';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib, { constructRecursive } from 'thing-editor/src/engine/lib';
import Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

import type { ComponentChild } from 'preact';
import type { FileDescClass } from 'thing-editor/src/editor/fs';

import { regeneratePrefabsTypings } from 'thing-editor/src/editor/utils/generate-editor-typings';
import loadSafeInstanceByClassName from 'thing-editor/src/editor/utils/load-safe-instance-by-class-name';

const prefabNameFilter = /[^a-zA-Z\-\/0-9_]/g;

const cachedImages = new Set();

const onPreviewButtonClick = (o: Container) => {
	if (o.__nodeExtendData.__isPreviewMode) {
		editorUtils.exitPreviewMode(o);
	} else {
		editorUtils.goToPreviewMode(o);
	}
	game.editor.refreshPropsEditor();
};

const classNamePropertyDescriptor = {
	get: () => {
		let o = game.editor.selection[0];
		return (o.__nodeExtendData.__isPreviewMode) ? 'danger-btn' : undefined;
	}
};

export namespace editorUtils {

	export const findInvisibleParent = (o: Container): Container | undefined => {
		if (!o) {
			return o;
		}
		if (!o.visible || o.alpha < 0.01 || o.scale.x < 0.001 || o.scale.y < 0.001 || (game.__EDITOR_mode && o.__hideInEditor) || (o instanceof Sprite && o.image === 'EMPTY' && o === game.editor.selection[0])) {
			return o;
		}
		if (o.parent === game.stage) {
			return;
		}
		return findInvisibleParent(o.parent);
	};

	export const isInModal = (o: EventTarget | HTMLElement | null) => {
		if (o) {
			return (o as HTMLElement).closest('.modal-body');
		}
	};

	export const exitPreviewMode = (o: Container) => {
		if (!o.__nodeExtendData.__isPreviewMode) return;
		editorEvents.off('beforePropertyChanged', o.__exitPreviewMode!);
		o.__exitPreviewMode!();
		o.__nodeExtendData.__isPreviewMode = false;
	};

	export const goToPreviewMode = (o: Container) => {
		if (o.__nodeExtendData.__isPreviewMode) return;
		editorEvents.on('beforePropertyChanged', o.__exitPreviewMode!);
		o.__goToPreviewMode!();
		o.__nodeExtendData.__isPreviewMode = true;
	};

	export const canDelete = () => {
		return (game.editor.selection.length > 0) && (game.editor.selection.indexOf(game.currentContainer) < 0);
	};

	export const deleteSelected = () => {

		const editor = game.editor;

		if ((editor.selection.length > 0) && (editor.selection[0] !== game.currentContainer)) {

			DataPathFixer.rememberPathReferences();

			let p = editor.selection[0].parent;
			let i = p.getChildIndex(editor.selection[0]);

			while (editor.selection.length > 0) {
				let o = editor.selection[0];
				Lib.__invalidateSerializationCache(o.parent);
				o.remove();
			}

			let isAnotherNodeSelected = false;

			while (i < p.children.length) {
				let c = p.getChildAt(i++);
				if (!getParentWhichHideChildren(c, true)) {
					editor.ui.sceneTree.selectInTree(c);
					isAnotherNodeSelected = true;
					break;
				}
			}
			i--;
			if (!isAnotherNodeSelected) {
				while (i >= 0) {
					let c = p.getChildAt(i--);
					if (!getParentWhichHideChildren(c, true)) {
						editor.ui.sceneTree.selectInTree(c);
						isAnotherNodeSelected = true;
						break;
					}
				}
			}

			if (!isAnotherNodeSelected && (p !== game.stage)) {
				editor.ui.sceneTree.selectInTree(p);
			}

			DataPathFixer.validatePathReferences();

			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	};

	export const centralizeObjectToContent = (o: Container) => {
		if (!o.children.length) {
			return;
		}
		let b = o.getBounds();
		let p;
		if (b.width > 0 || b.height > 0) {
			let b = o.getBounds();
			let midX = b.x + b.width / 2;
			let midY = b.y + b.height / 2;
			p = new Point(midX, midY);
			o.parent.toLocal(p, undefined, p);
		} else {
			let midX = 0;
			for (let c of o.children) {
				midX += c.x;
			}
			midX /= o.children.length;

			let midY = 0;
			for (let c of o.children) {
				midY += c.y;
			}
			midY /= o.children.length;
			p = new Point(midX, midY);
			o.parent.toLocal(p, o, p);
		}

		let pos = o.getGlobalPosition();
		let p2 = new Point();
		o.parent.toLocal(pos, undefined, p2);

		game.editor.moveContainerWithoutChildren(o, Math.round(p.x - p2.x), Math.round(p.y - p2.y));
	};

	export const makePreviewModeButton = (title: string, helpUrl: string): EditablePropertyDescRaw => {
		let previewBtnProperty: EditablePropertyDescRaw = {
			type: 'btn',
			title,
			helpUrl,
			name: title,
			onClick: onPreviewButtonClick
		};
		Object.defineProperty(previewBtnProperty, 'className', classNamePropertyDescriptor);
		return previewBtnProperty;
	};


	export const clone = () => {
		if (game.editor.selection.some((o) => o.parent === game.stage)) {
			game.editor.ui.modal.showInfo('Can not clone root object', '', 30017);
			return;
		}

		DataPathFixer.rememberPathReferences();

		game.editor.disableFieldsCache = true;
		let allCloned: Container[] = [];

		game.editor.selection.some((o) => {
			let clone: Container = Lib._deserializeObject(Lib.__serializeObject(o));
			allCloned.push(clone);

			let cloneExData = clone.__nodeExtendData;
			let exData = o.__nodeExtendData;
			if (exData.hidePropsEditor) {
				cloneExData.hidePropsEditor = exData.hidePropsEditor;
			}
			if (exData.noSerialize) {
				cloneExData.noSerialize = exData.noSerialize;
			}
			cloneExData.__isJustCloned = true;

			clone.name = increaseNumberInName(clone.name);

			let i = o.parent.children.indexOf(o) + 1;
			while (o.parent.children[i] && ((allCloned.indexOf(o.parent.children[i]) >= 0) || o.parent.children[i].__nodeExtendData.isSelected)) {
				i++;
			}
			o.parent.addChildAt(clone, i);

			if (!game.__EDITOR_mode) {
				constructRecursive(clone);
			}
			Lib.__invalidateSerializationCache(clone);

		});

		game.editor.selection.clearSelection();
		for (let c of allCloned) {
			game.editor.selection.add(c);
		}

		game.editor.disableFieldsCache = false;

		DataPathFixer.validatePathReferences();
		for (let c of allCloned) {
			let cloneExData = c.__nodeExtendData;
			cloneExData.__isJustCloned = false;
		}
		game.editor.refreshTreeViewAndPropertyEditor();
		game.editor.sceneModified();
	};

	export const onDeleteClick = () => {

		if ((game.editor.selection.length > 0) && (game.editor.selection[0] !== game.currentContainer)) {

			DataPathFixer.rememberPathReferences();

			let p = game.editor.selection[0].parent;
			let i = p.getChildIndex(game.editor.selection[0]);

			while (game.editor.selection.length > 0) {
				let o = game.editor.selection[0];
				Lib.__invalidateSerializationCache(o.parent);
				o.remove();
			}

			let isNextChildSelected = false;

			while (i < p.children.length) {
				let c = p.getChildAt(i++);
				if (!getParentWhichHideChildren(c, true)) {
					game.editor.ui.sceneTree.selectInTree(c);
					isNextChildSelected = true;
					break;
				}
			}
			i--;
			if (!isNextChildSelected) {
				while (i >= 0) {
					let c = p.getChildAt(i--);
					if (!getParentWhichHideChildren(c, true)) {
						game.editor.ui.sceneTree.selectInTree(c);
						isNextChildSelected = true;
						break;
					}
				}
			}

			if (!isNextChildSelected && (p !== game.stage)) {
				game.editor.ui.sceneTree.selectInTree(p);
			}

			DataPathFixer.validatePathReferences();

			game.editor.refreshTreeViewAndPropertyEditor();
			game.editor.sceneModified(true);
		}
	};

	export const enterPrefabName = (defaultPrefabName: string, title: ComponentChild) => {
		return game.editor.ui.modal.showPrompt(title,
			defaultPrefabName,
			(val) => { // filter
				return val.replace(prefabNameFilter, '-');
			},
			(val) => { //accept
				if (Lib.prefabs.hasOwnProperty(val)) {
					return 'Prefab with such name already exists';
				}
				if (val.endsWith('/') || val.startsWith('/')) {
					return 'name can not begin or end with "/"';
				}
			}
		);
	};

	export const savePrefab = (container: Container | FileDescClass) => {

		const isContainer = container instanceof Container;

		if (container instanceof Scene) {
			game.editor.ui.modal.showInfo('You can not save Scene as prefab. Please select some object from scene first.', undefined, 32037);
		} else {

			game.editor.chooseAssetsFolder('Where to save prefab?').then((chosenFolder) => {

				if (!chosenFolder!) {
					return;
				}

				let defaultPrefabName = '';
				if (PrefabEditor.currentPrefabName) {
					let a = PrefabEditor.currentPrefabName.split('/');
					a.pop();
					defaultPrefabName = a.join('/');
					if (defaultPrefabName) {
						defaultPrefabName += '/';
					}
				}

				enterPrefabName(defaultPrefabName, R.span(null, 'Enter name for new prefab: ', isContainer ? R.sceneNode(container) : renderClass(container))).then((enteredName) => {
					if (enteredName) {
						const fin = (doNotOpenToEdit = false) => {
							if (isContainer) {
								Lib.__savePrefab(container, enteredName, chosenFolder);
							} else {
								const instance = loadSafeInstanceByClassName(container.asset.__className);
								Lib.__savePrefab(instance, enteredName, chosenFolder);
								Lib.destroyObjectAndChildren(instance);
							}
							regeneratePrefabsTypings();
							if (!doNotOpenToEdit) {
								PrefabEditor.editPrefab(enteredName);
							}
						};

						if (container !== game.currentContainer && isContainer) {
							game.editor.ui.modal.showEditorQuestion('Reference?', 'Turn selected in to prefab reference?', () => {
								fin(true);
								Lib.__preparePrefabReference(container, enteredName);
								Lib.__invalidateSerializationCache(container);
								game.editor.sceneModified(true);
							}, 'Convert to prefab reference', fin, 'Keep original', true);
						} else {
							fin();
						}
					}
				});
			});
		}
	};

	export const isCanBeUnwrapped = () => {
		if (game.editor.selection.length !== 1) {
			return;
		}
		let o = game.editor.selection[0];
		if ((o.parent === game.stage) && !game.__EDITOR_mode) {
			return;
		}
		if (o === game.currentContainer) {
			return !(o instanceof Scene) && (o.children.length === 1);
		}
		return o.children.length > 0;
	};

	export const onExportAsPngClick = async () => {
		let o = game.editor.selection[0];
		let blob = await exportAsPng(o);
		if (blob) {
			let a = document.createElement('a');
			document.body.append(a);
			a.download = (o.name || 'image') + '.png';
			a.href = URL.createObjectURL(blob);
			a.click();
			a.remove();
		} else {
			game.editor.ui.modal.showModal('Nothing visible selected to export.');
		}
	};

	export const onUnwrapClick = () => {
		if (isCanBeUnwrapped()) {

			DataPathFixer.rememberPathReferences();

			let o = game.editor.selection[0];
			let parent = o.parent;
			let i = parent.getChildIndex(o);

			let isPrefab = (o === game.currentContainer);

			game.editor.selection.clearSelection();

			if (isPrefab && o.children.length !== 1) {
				game.editor.ui.modal.showError('To unwrap prefab it is should have exactly one children.', 30005);
				return;
			}

			while (o.children.length > 0) {
				let c = o.getChildAt(o.children.length - 1);
				c.detachFromParent();

				parent.toLocal(c, o, c);

				if (isPrefab) {
					c.name = o.name;
					Lib.__invalidateSerializationCache(c);
					game.__setCurrentContainerContent(c);
				} else {
					parent.addChildAt(c, i);
				}

				c.rotation += o.rotation;
				game.editor.ui.sceneTree.selectInTree(c, true);
			}


			if (!isPrefab) {
				Lib.__invalidateSerializationCache(o.parent);
				o.remove();
			}

			DataPathFixer.validatePathReferences();
			game.editor.refreshTreeViewAndPropertyEditor();
			game.editor.sceneModified(true);
		}
	};

	export const onCopyClick = () => {

		if (game.editor.selection.length > 0) {
			const data = game.editor.selection.map(Lib.__serializeObject);
			let assets = new Set<string>();

			clipboard.data = {
				data,
				assets: Array.from(assets),
				project: game.editor.currentProjectDir,
				libs: game.projectDesc.libs
			};

			game.editor.refreshTreeViewAndPropertyEditor();
		}
	};

	export const wrap = (nodes: Container[], wrapper: Container) => {
		const o = nodes[0];
		let parent = o.parent;
		for (let c of nodes) {
			if (c.parent !== parent) {
				game.editor.ui.modal.showInfo('Selected object should have same parent to be wrapped.', 'Can not wrap', 30012);
				return;
			}
		}

		if (o instanceof Scene) {
			game.editor.ui.modal.showInfo('Scene can not be wrapped, you can change scene\'s type instead.', 'Can not wrap', 30013);
			return;
		}
		DataPathFixer.rememberPathReferences();
		let isPrefab = o === game.currentContainer;
		let prefabName = game.currentContainer.name;
		game.editor.selection.clearSelection();

		let indexToAdd = parent.getChildIndex(o);

		for (let c of nodes) {
			wrapper.addChild(c);
		}
		if (isPrefab) {
			wrapper.name = prefabName;
			o.name = null;
			let data = Lib.__serializeObject(wrapper);
			wrapper = Lib._deserializeObject(data);
			game.__setCurrentContainerContent(wrapper);
		} else {
			parent.addChildAt(wrapper, indexToAdd);
		}
		Lib.__invalidateSerializationCache(wrapper);

		game.editor.selection.clearSelection();
		game.editor.ui.sceneTree.selectInTree(wrapper);
		wrapper.__nodeExtendData.childrenExpanded = true;
		DataPathFixer.validatePathReferences();
		game.editor.sceneModified(true);
		Lib.__callInitIfGameRuns(wrapper);
	};

	export const wrapSelected = (Class?: SourceMappedConstructor, prefabName?: string) => {
		assert(game.__EDITOR_mode, 'Can not wrap in running mode.');

		if (game.editor.selection.length < 1) {
			assert(false, 'Nothing selected to be wrapped.');
		} else if ((!Class && !prefabName) && (!clipboard.data || clipboard.data.data.length !== 1)) {
			game.editor.ui.status.error('Exactly one container should be copied in to clipBoard to wrap selection with it.');
		} else {
			let a = game.editor.selection.slice(0);
			let w;
			if (Class) {
				w = loadSafeInstanceByClassName(Class.__className, true);
				wrap(a, w);
			} else {

				if (prefabName) {
					w = Lib.__loadPrefabReference(prefabName);
				} else {
					game.editor.disableFieldsCache = true;
					w = Lib._deserializeObject({ c: clipboard.data.data[0].c, p: clipboard.data.data[0].p });
					game.editor.disableFieldsCache = false;
				}
				wrap(a, w);
			}
		}
	};

	export const onCutClick = () => {
		onCopyClick();
		onDeleteClick();
	};

	export const onPasteWrapClick = () => {
		wrapSelected();
	};

	export const onPasteClick = async () => {
		if (canPaste()) {

			DataPathFixer.rememberPathReferences();

			game.editor.disableFieldsCache = true;
			let added: Container[] = [];

			let insertTo = game.editor.selection.slice();
			if (insertTo.length === 0) {
				insertTo.push(game.currentContainer);
			}
			game.editor.selection.clearSelection();
			for (let selected of insertTo) {
				clipboard.data.data.some((data) => {
					let o = Lib._deserializeObject(data);
					added.push(o);
					o.__nodeExtendData.__isJustCloned = true;
					game.editor.addTo(selected, o);
				});
			}
			DataPathFixer.validatePathReferences();

			while (added.length > 0) {
				let o = added.shift() as Container;
				o.__nodeExtendData.__isJustCloned = false;
			}
			game.editor.sceneModified(true);
			game.editor.disableFieldsCache = false;
			return added;
		}
	};

	export const canPaste = () => {
		return clipboard.data && clipboard.data.data.length > 0;
	};

	export const onBringUpClick = () => {
		let i = 0;
		while (onMoveUpClick(true) && i++ < 100000); //moves selected object up until its become top
		game.editor.sceneModified(true);
		game.editor.refreshTreeViewAndPropertyEditor();
	};

	export const onMoveUpClick = (doNotSaveHistoryState = false) => {
		let ret = false;

		game.editor.selection.some((o) => {
			if (o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if (i > 0) {
					let upper = o.parent.getChildAt(i - 1);
					if (!upper.__nodeExtendData.isSelected) {
						o.parent.swapChildren(o, upper);
						Lib.__invalidateSerializationCache(o.parent);
						ret = true;
					}
				}
			}
		});
		if (doNotSaveHistoryState !== true) {
			game.editor.sceneModified(true);
			game.editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	};

	export const preCacheImages = (preactContent?: any) => {
		if (preactContent && (preactContent as any).props) {
			if (preactContent.type === 'img') {
				if (!cachedImages.has(preactContent.props.src)) {
					cachedImages.add(preactContent.props.src);
					const img = new Image();
					img.src = preactContent.props.src;
					document.body.appendChild(img);
					img.style.display = 'none';
				}
			}
			if (preactContent.props.children) {
				preactContent.props.children.forEach(preCacheImages);
			}
		}
	};

	export const onMoveDownClick = (doNotSaveHistoryState = false) => {
		let ret = false;
		let a = game.editor.selection.slice(0);
		a.reverse();
		a.some((o) => {
			if (o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if (i < (o.parent.children.length - 1)) {
					let lower = o.parent.getChildAt(i + 1);
					if (!lower.__nodeExtendData.isSelected) {
						o.parent.swapChildren(o, lower);
						Lib.__invalidateSerializationCache(o.parent);
						ret = true;
					}
				}
			}
		});
		if (doNotSaveHistoryState !== true) {
			game.editor.sceneModified(true);
			game.editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	};
	export const onBringDownClick = () => {
		let i = 0;
		while (onMoveDownClick(true) && i++ < 100000); //move selected element down until its become bottom.
		game.editor.sceneModified(true);
		game.editor.refreshTreeViewAndPropertyEditor();
	};

	/// #if EDITOR
	export const __setTextureSettingsBits = (name: string, bits: number, mask = 0xffffffff) => {
		let current = Lib._getTextureSettingsBits(name, 0xffffffff);
		let n = (current & (mask ^ 0xffffffff)) | bits;
		if (n !== current) {
			if (n === 0) {
				delete game.projectDesc.loadOnDemandTextures[name];
			} else {
				game.projectDesc.loadOnDemandTextures[name] = n;
			}
			game.editor.saveProjectDesc();

			const TEXTURE_BITS = 4 | 8 | 16;
			if (Lib.hasTexture(name) && ((current & TEXTURE_BITS) !== (n & TEXTURE_BITS))) {
				let baseTexture = Lib.getTexture(name).baseTexture;
				baseTexture.mipmap = (n & 4) ? MIPMAP_MODES.ON : MIPMAP_MODES.OFF;
				if (n & 16) {
					baseTexture.wrapMode = WRAP_MODES.MIRRORED_REPEAT;
				} else if (n & 8) {
					baseTexture.wrapMode = WRAP_MODES.REPEAT;
				} else {
					baseTexture.wrapMode = WRAP_MODES.CLAMP;
				}
				baseTexture.update();
				game.editor.ui.refresh();
			}
		}
	};
	/// #endif
}

interface ClipboardData {
	data: SerializedObject[];
	assets: string[];
	project: string;
	libs: string[];

}

class clipboard {
	static set data(cd: ClipboardData) {
		game.editor.settings.setItem('__EDITOR-clipboard-data', cd);
		game.editor.settings.removeItem('__EDITOR-clipboard-data-timeline-name');
	}

	static get data(): ClipboardData {
		return game.editor.settings.getItem('__EDITOR-clipboard-data');
	}

}
