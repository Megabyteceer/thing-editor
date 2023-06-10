import { EventEmitter } from "events";
import { Container } from "pixi.js";
import { h } from "preact";
import { KeyedMap, SerializedObject } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import regenerateCurrentSceneMapTypings from "thing-editor/src/editor/utils/generate-editor-typings";
import type { SelectionData } from "thing-editor/src/editor/utils/selection";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import Pool from "thing-editor/src/engine/utils/pool";
import TypedEmitter from "typed-emitter";

const HISTORY_LEN = 100;
const STRICT_HISTORY_LEN = 20;

let undoStack: KeyedMap<HistoryRecord[]> = {}; //separated undo/redo array for scene and each modal objects
let redosStack: KeyedMap<HistoryRecord[]> = {};
let historyUi: HistoryUi;

let instance: History;


let lastAppliedTreeData: HistorySerializedData;

let currentSelectionNavigation = 0;

function applyState(state: HistoryRecord) {
	assert(state, 'Empty history record.');
	assert(game.__EDITOR_mode, "Attempt to save undo history in runtime mode.");
	currentSelectionNavigation = 0;
	let stateChanged = state.treeData !== lastAppliedTreeData;
	if(stateChanged) {
		instance.events.emit('beforeHistoryJump');
		Pool.__resetIdCounter();
		let node = Lib._deserializeObject(state.treeData);
		game.__setCurrentContainerContent(node);
	}
	game.editor.selection.loadSelection(state.selectionData);
	const stage = game.stage as Container;
	stage.x = state.selectionData._stageX as number;
	stage.y = state.selectionData._stageY as number;
	stage.scale.x = stage.scale.y = state.selectionData._stageS as number;
	lastAppliedTreeData = state.treeData;
	historyUi.refresh();
	if(stateChanged) {
		instance.events.emit('afterHistoryJump');
	}
}

function getHistoryName() {
	if((typeof game === 'undefined') || !game.currentContainer) {
		return;
	}
	let n = game.currentContainer.name;
	assert(n, 'currentContainer name is empty.');
	if(game.currentContainer instanceof Scene) {
		n = 's/' + n;
	} else {
		n = 'p/' + n;
	}
	return n;
}

type HistoryEvents = {
	beforeHistoryJump: () => void,
	afterHistoryJump: () => void
}

interface HistorySerializedData extends SerializedObject {
	_isModified?: boolean;
}

interface HistoryRecord {

	treeData: HistorySerializedData,
	/** field was edited to undo record created */
	fieldName: string | null,

	selectionData: SelectionData,

}

class History {

	//@ts-ignore
	events = new EventEmitter() as TypedEmitter<HistoryEvents>;

	constructor() {
		this.undo = this.undo.bind(this);
		this.redo = this.redo.bind(this);
		this.isRedoAvailable = this.isRedoAvailable.bind(this);
		this.isUndoAvailable = this.isUndoAvailable.bind(this);
		instance = this;

		window.addEventListener('mouseup', this.scheduleHistorySave);
		window.addEventListener('keyup', this.scheduleHistorySave);
	}

	_sceneModifiedInner(saveImmediately = false) {
		clearSelectionSaveTimeout();
		if(game.__EDITOR_mode) {
			needHistorySave = true;
			if(saveImmediately) {
				instance.scheduleHistorySave();
			}
		}
	}

	scheduleHistorySave() {
		if(!historySaveScheduled) {
			historySaveScheduled = setTimeout(() => {
				historySaveScheduled = 0;
				instance.saveHistoryNow();
				regenerateCurrentSceneMapTypings();
			}, 1);
		}
	}

	scheduleSelectionSave() {
		clearSelectionSaveTimeout();
		if(game.__EDITOR_mode) {
			needSaveSelectionInToHistory = setTimeout(saveSelectionState, 50);
		}
	}

	saveHistoryNow() {
		if(needHistorySave) {
			clearSelectionSaveTimeout();
			needHistorySave = false;
			instance.addHistoryState();
			if(historySaveScheduled) {
				clearInterval(historySaveScheduled);
				historySaveScheduled = 0;
			}
		}
	}

	isRedoAvailable() {
		let r = this._redoList;
		return r && r.length > 0;
	}

	isUndoAvailable() {
		let u = this._undoList;
		return u && u.length > 1;
	}

	get _undoList(): HistoryRecord[] {
		let n = getHistoryName();
		if(!n) {
			return [];
		}
		if(!undoStack.hasOwnProperty(n)) {
			undoStack[n] = [];
		}
		return undoStack[n];
	}

	get _redoList(): HistoryRecord[] {
		let n = getHistoryName();
		if(!n) {
			return [];
		}
		if(!redosStack.hasOwnProperty(n)) {
			redosStack[n] = [];
		}
		return redosStack[n];
	}

	_pushCurrentStateToUndoHistory(selectionData: SelectionData, selectionOnly = false) {
		assert(game.__EDITOR_mode, "Attempt to use history in running time.");

		let treeData: HistorySerializedData;

		if(selectionOnly) {
			if(!this.currentState || arraysEqual(selectionData, this.currentState.selectionData)) {
				return;
			}
			treeData = this.currentState.treeData;
		} else {
			Lib.__invalidateSerializationCache(game.currentContainer);
			treeData = Lib.__serializeObject(game.currentContainer);
			treeData._isModified = true;
		}

		let historyRecord: HistoryRecord = { treeData, selectionData, fieldName: game.editor._lastChangedFiledName };
		game.editor._lastChangedFiledName = null;

		lastAppliedTreeData = historyRecord.treeData;

		this._undoList.push(historyRecord);

		//reduce and limit history
		if(this._undoList.length > HISTORY_LEN) {
			let i = HISTORY_LEN - 1;
			while(i > STRICT_HISTORY_LEN) {
				i -= 2;
				this._undoList.splice(i, 1);
			}
		}
		this.updateUi();
	}

	addSelectionHistoryState() {
		this.addHistoryState(true);
	}

	addHistoryState(selectionOnly = false) {
		let selectionData = game.editor.selection.saveSelection();

		const stage = game.stage as Container;
		selectionData._stageX = stage.x;
		selectionData._stageY = stage.y;
		selectionData._stageS = stage.scale.x;
		if(!selectionOnly) {
			this._redoList.length = 0;
		}
		this._pushCurrentStateToUndoHistory(selectionData, selectionOnly);
	}

	undo() {
		if(this.isUndoAvailable()) {
			if(this.currentState.fieldName) {
				game.editor.ui.propsEditor.selectField(this.currentState.fieldName);
			}
			this._redoList.push(this._undoList.pop() as HistoryRecord);
			applyState(this.currentState);
		}
	}

	redo() {
		if(this.isRedoAvailable()) {
			this._undoList.push(this._redoList.pop() as HistoryRecord);
			applyState(this.currentState);
			if(this.currentState.fieldName) {
				game.editor.ui.propsEditor.selectField(this.currentState.fieldName);
			}
		}
	}

	get currentState(): HistoryRecord {
		let undo = this._undoList;
		if(undo) {
			return undo[undo.length - 1];
		}
		//@ts-ignore
		return null;
	}

	updateUi() {
		historyUi && historyUi.refresh();
	}

	setCurrentStateModified() {
		this.currentState.treeData._isModified = true;
	}

	setCurrentStateUnmodified() {
		if(this._undoList.length === 0 && this._redoList.length === 0) {
			this.addHistoryState();
		}
		this._undoList.some((s) => {
			s.treeData._isModified = true;
		});
		delete (this.currentState as HistoryRecord).treeData._isModified;
		this.updateUi();
	}

	get isStateModified() {
		return this.currentState && this.currentState.treeData._isModified;
	}

	buttonsRenderer() {
		return h(HistoryUi, null);
	}

	navigateSelection(direction = -1) {
		while(true) {
			currentSelectionNavigation += direction;

			let targetHistoryState;
			if(currentSelectionNavigation <= 0) {
				targetHistoryState = this._undoList[this._undoList.length - 1 + currentSelectionNavigation];
				currentSelectionNavigation = Math.max(-(this._undoList.length - 1), currentSelectionNavigation);
			} else {
				targetHistoryState = this._redoList[currentSelectionNavigation - 1];
				currentSelectionNavigation = Math.min(this._redoList.length, currentSelectionNavigation);
			}
			if(targetHistoryState) {
				if(JSON.stringify(targetHistoryState.selectionData) !== JSON.stringify(game.editor.selection.saveCurrentSelection())) {
					game.editor.selection.loadSelection(targetHistoryState.selectionData);
					break;
				}
			} else {
				break;
			}
		}
	}
}



let historySaveScheduled = 0;
let needHistorySave = false;

class HistoryUi extends ComponentDebounced {
	constructor() {
		super();
		historyUi = this;
	}

	render() {
		if(!instance._undoList) {
			return R.span(null);
		}

		return R.span(null,
			R.btn('Undo', game.editor.history.undo, undefined, 'menu-btn', { key: 'z', ctrlKey: true }, !instance.isUndoAvailable() || !game.__EDITOR_mode),
			R.btn('Redo', game.editor.history.redo, undefined, 'menu-btn', { key: 'y', ctrlKey: true }, !instance.isRedoAvailable() || !game.__EDITOR_mode),
			R.btn('<<', () => game.editor.history.navigateSelection(-1), undefined, 'menu-btn', { key: 'ArrowLeft', ctrlKey: true, altKey: true }, !game.__EDITOR_mode),
			R.btn('>>', () => game.editor.history.navigateSelection(1), undefined, 'menu-btn', { key: 'ArrowRight', ctrlKey: true, altKey: true }, !game.__EDITOR_mode),

		);
	}
}

let needSaveSelectionInToHistory = 0;

function clearSelectionSaveTimeout() {
	if(needSaveSelectionInToHistory) {
		clearInterval(needSaveSelectionInToHistory);
		needSaveSelectionInToHistory = 0;
	}
}

function saveSelectionState() {
	if(game.__EDITOR_mode) {
		game.editor.history.addSelectionHistoryState();
	}
	needSaveSelectionInToHistory = 0;
}

function arraysEqual(a: any[], b: any[]) {
	if(a === b) return true;
	if(a == null || b == null) return false;
	if(a.length !== b.length) return false;

	for(var i = 0; i < a.length; ++i) {
		if(Array.isArray(a[i])) {
			if(!arraysEqual(a[i], b[i])) return false;
		} else {
			if(a[i] !== b[i]) return false;
		}
	}
	return true;
}


let historyInstance = new History();

export default historyInstance;