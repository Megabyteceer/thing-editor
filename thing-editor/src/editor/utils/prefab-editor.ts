import { Container, Sprite, Texture } from "pixi.js";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import loadDynamicTextures from "thing-editor/src/engine/utils/load-dynamic-textures";

let prefabsStack: string[] = [];
let previewBlackout: Sprite;

const blackouts: Sprite[] = [];

function createBlackout() {
	let b = Lib._loadClassInstanceById('Sprite');
	b.texture = Texture.WHITE;
	b.tint = 30;
	b.alpha = 0.9;
	b.__nodeExtendData.hidden = true;
	blackouts.push(b); //TODO resize blackout to cover viewport always without any seams
	return b;
}

function getCurrentPrefabName() {
	return prefabsStack[prefabsStack.length - 1];
}

export default class PrefabEditor {

	static editPrefab(name: string, isItStepInToStack = false) {
		if(game.__EDITOR_mode) {
			if(!Lib.hasPrefab(name)) {
				game.editor.ui.modal.showError("No prefab with name " + name + " exists.");
				return;
			}
			let a = prefabsStack.slice();
			PrefabEditor.acceptPrefabEdition();
			if(isItStepInToStack) {
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
		return previewBlackout.tint;
	}

	static set BGColor(tint: number) {
		if(tint === undefined) {
			tint = 30;
		} else if(this.currentPrefabName) {
			game.editor.settings.setItem('prefab-bg' + this.currentPrefabName, tint);
		}

		previewBlackout.tint = tint;
	}

	static showPreview(object: Container) {
		if(!previewBlackout) {
			previewBlackout = createBlackout();
		}
		//TODO this.exitIsolation();
		game.editor.ui.viewport.resetZoom();
		PrefabEditor.BGColor = game.editor.settings.getItem('prefab-bg' + object.name, 120);
		PrefabEditor.hidePreview();
		game.stage.addChild(previewBlackout);
		game.showModal(object, undefined, true);
		this.currentPrefabName = object.name;
		object.__nodeExtendData.childrenExpanded = true;
		game.stage.x = -object.x + game.W / 2;
		game.stage.y = -object.y + game.H / 2;
		previewBlackout.x = -game.stage.x;
		previewBlackout.y = -game.stage.y;
		setTimeout(() => {
			let selectionData = game.settings.getItem('prefab-selection' + game.currentContainer.name);
			if(selectionData) {
				game.editor.selection.loadSelection(selectionData);
			}
		}, 1);
		game.editor.history.updateUi();
		loadDynamicTextures();
	}

	static currentPrefabName: string | null;

	static hidePreview() {
		//TODO this.exitIsolation();
		game.editor.ui.viewport.resetZoom();
		previewBlackout.detachFromParent();
		if(this.currentPrefabName) {
			let selectionData = game.editor.selection.saveSelection();
			game.settings.setItem('prefab-selection' + game.currentContainer.name, selectionData);
			assert(game.currentContainer.name === this.currentPrefabName, "Wrong edition prefab name");
			game.hideModal();
			this.currentPrefabName = null;
			game.editor.ui.refresh();
			loadDynamicTextures();
			game.editor.selection.loadSelection(game.editor.history.currentState.selectionData);
		}
	}

	static acceptPrefabEdition(oneStepOnly = false) {
		//TODO call validators (add static __validate method for SourceMapedClass)

		if(document.activeElement && document.activeElement.tagName === "INPUT") {
			(document.activeElement as HTMLInputElement).blur();
		}
		let name = getCurrentPrefabName();
		let isChanged = prefabsStack.length && game.editor.isCurrentContainerModified;
		if(isChanged) {
			game.editor.history.setCurrentStateUnmodified();
			game.editor._callInPortraitMode(() => {
				Lib.__savePrefab(game.currentContainer, name);
			});
		}
		PrefabEditor.exitPrefabEdit(oneStepOnly);
		game.editor.ui.refresh();
		if(isChanged) {
			// TODO PrefabReference.__refreshPrefabRefs(name);
			game.editor.regeneratePrefabsTypings();
		}
	}

	static exitPrefabEdit(oneStepOnly = false) {
		/*if(game.editor.overlay) {
			//TODO editor.overlay.exitIsolation();
		}*/
		if(prefabsStack.length) {
			game.editor.ui.viewport.setPrefabMode();
			PrefabEditor.hidePreview();
			if(oneStepOnly) {
				prefabsStack.pop();
				if(prefabsStack.length > 0) {
					PrefabEditor.editPrefab(prefabsStack.pop() as string, true);
				}
			} else {
				prefabsStack.length = 0;
			}
		}
	}

}