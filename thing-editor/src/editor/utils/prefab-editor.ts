import type { Container } from 'pixi.js';
import { exitIsolation } from 'thing-editor/src/editor/ui/isolation';
import { regeneratePrefabsTypings } from 'thing-editor/src/editor/utils/generate-editor-typings';

import __refreshPrefabRefs, { __refreshPrefabRefsPrepare } from 'thing-editor/src/editor/utils/refresh-prefabs';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type __SystemBackDrop from 'thing-editor/src/engine/lib/assets/src/___system/backdrop.c';
import type Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';
import loadDynamicTextures from 'thing-editor/src/engine/utils/load-dynamic-textures';

let prefabsStack: string[] = [];
let backDrop: Container;
let backDropBG: Shape;

export default class PrefabEditor {

	static editPrefab(name: string, isItStepInToStack = false) {
		if (game.__EDITOR_mode) {
			if (!Lib.hasPrefab(name)) {
				game.editor.ui.modal.showError('No prefab with name ' + name + ' exists.');
				return;
			}
			let a = prefabsStack.slice();
			PrefabEditor.acceptPrefabEdition();
			if (isItStepInToStack) {
				prefabsStack = a;
			}
			let preview = Lib.loadPrefab(name);
			PrefabEditor.showPreview(preview);
			game.editor.ui.sceneTree.selectInTree(preview);
			game.editor.ui.viewport.setPrefabMode(name);
			game.editor.history.setCurrentStateUnmodified();
			prefabsStack.push(name);
			game.editor.ui.refresh();
		}
	}

	static get BGColor() {
		return backDropBG.shapeFillColor;
	}

	static set BGColor(val: number) {
		backDropBG.shapeFillColor = val;
	}

	private static savePrefabSettings() {
		if (this.currentPrefabName) {
			game.editor.settings.setItem('prefab-settings' + this.currentPrefabName, {
				bg: backDropBG.shapeFillColor,
				x: game.stage.x,
				y: game.stage.y,
				s: game.stage.scale.x
			});
		}
	}

	private static showPreview(object: Container) {
		if (!backDrop) {
			backDrop = Lib.loadPrefab('___system/backdrop') as __SystemBackDrop;
			backDrop.name = null; // prevent get by name error;
			backDrop.__nodeExtendData.hidden = true;
			backDropBG = backDrop.findChildByName('backdrop') as Shape;
		}
		exitIsolation();
		PrefabEditor.hidePreview();
		const prefabSettings = game.editor.settings.getItem('prefab-settings' + object.name, { bg: 0 });
		PrefabEditor.BGColor = prefabSettings.bg;
		game.stage.scale.x = game.stage.scale.y = prefabSettings.s || 1;
		game.stage.x = prefabSettings.x || (-object.x + game.W / 2);
		game.stage.y = prefabSettings.y || (-object.y + game.H / 2);

		game.stage.addChild(backDrop);
		game.showModal(object, undefined, true);
		this.currentPrefabName = object.name;
		object.__nodeExtendData.childrenExpanded = true;
		window.setTimeout(() => {
			let selectionData = game.editor.settingsLocal.getItem('__prefab-selection' + game.currentContainer.name);
			if (selectionData) {
				game.editor.selection.loadSelection(selectionData);
			}
		}, 1);

		loadDynamicTextures();
	}

	static currentPrefabName: string | null;

	static hidePreview() {
		exitIsolation();
		game.editor.ui.viewport.resetZoom();
		backDrop.detachFromParent();
		if (this.currentPrefabName) {
			let selectionData = game.editor.selection.saveSelection();
			game.editor.settingsLocal.setItem('__prefab-selection' + game.currentContainer.name, selectionData);
			assert(game.currentContainer.name === this.currentPrefabName, 'Wrong edition prefab name');
			game.hideModal();
			this.currentPrefabName = null;
			game.editor.ui.refresh();
			loadDynamicTextures();
			game.editor.selection.loadSelection(game.editor.history.currentState.selectionData);
		}
	}

	static getCurrentPrefabName() {
		return prefabsStack[prefabsStack.length - 1];
	}

	static acceptPrefabEdition(oneStepOnly = false) {
		exitIsolation();
		this.savePrefabSettings();
		game.editor.blurPropsInputs();
		game.editor.history.saveHistoryNow();
		let name = this.getCurrentPrefabName();
		let isChanged = prefabsStack.length && game.editor.isCurrentContainerModified;
		if (isChanged) {
			__refreshPrefabRefsPrepare();
			if (prefabsStack.length) {
				if (PrefabEditor.checkPrefabReferenceForLoops(game.currentContainer, name)) {
					return false;
				}
				game.editor.history.setCurrentStateUnmodified();
				game.editor._callInPortraitMode(() => {
					Lib.__savePrefab(game.currentContainer, name);
				});
				game.editor.validateResources();
			}
		}

		PrefabEditor.exitPrefabEdit(oneStepOnly);
		if (isChanged) {
			__refreshPrefabRefs();
			regeneratePrefabsTypings();
		}
	}

	static checkPrefabReferenceForLoops(o: Container, prefabName: string): boolean {
		let ret = false;
		o.forAllChildren((o) => {
			if (o.__nodeExtendData.isPrefabReference) {
				if (checkPrefabDataForLoop(Lib.prefabs[o.__nodeExtendData.isPrefabReference], prefabName)) {
					game.editor.ui.status.error('Could not save prefab changes. Loop in prefab references detected', 99999, o);
					game.editor.selection.select(o);
					ret = true;
				}
			}
		});
		return ret;
	}

	static exitPrefabEdit(oneStepOnly = false) {
		exitIsolation();
		if (prefabsStack.length) {

			game.editor.ui.viewport.setPrefabMode();
			PrefabEditor.hidePreview();
			if (oneStepOnly) {
				prefabsStack.pop();
				if (prefabsStack.length > 0) {
					PrefabEditor.editPrefab(prefabsStack.pop() as string, true);
				}
			} else {
				prefabsStack.length = 0;
			}
			game.editor.ui.refresh();
		}
	}
}

function checkPrefabDataForLoop(data: SerializedObject, loopName: string): boolean {
	if (data.r === loopName) {
		return true;
	}
	if (data[':']) {
		return Object.values(data[':']).some((d) => {
			return checkPrefabDataForLoop(d, loopName);
		});
	}
	return false;
}
