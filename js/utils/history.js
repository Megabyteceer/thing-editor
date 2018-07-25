import Lib from "/thing-engine/js/lib.js";
import game from "/thing-engine/js/game.js";

const HISTORY_LEN = 100;
const STRICT_HISTORY_LEN = 20;

let undosStack = {}; //separated undo/redo array for scene and each modal objects
let redosStack = {};
let historyUi;

let instance;

let lastAppliedTreeData;

function applyState(state) {
	assert(state, 'Empty history record');
	assert(game.__EDITORmode);

	if(state.treeData !== lastAppliedTreeData) {
		let node = Lib._deserializeObject(state.treeData);
		game.__setCurrentContainerContent(node);
		lastAppliedTreeData = state.treeData;
	}
	editor.selection.loadSelection(state.selectionData);
}

class History {
	
	constructor() {
		this.undo = this.undo.bind(this);
		this.redo = this.redo.bind(this);
		this.isRedoAvailable = this.isRedoAvailable.bind(this);
		this.isUndoAvailable = this.isUndoAvailable.bind(this);
		instance = this;
	}

	isRedoAvailable() {
		let r = this._redos;
		return r && r.length > 0;
	}

	isUndoAvailable() {
		let u = this._undos;
		return u && u.length > 1;
	}

	get _undos() {
		if((typeof game === 'undefined') || !game.currentContainer) {
			return [];
		}
		let n = game.currentContainer.name;
		assert(n, 'currentContainer name is empty.');
		if(!undosStack.hasOwnProperty(n)) {
			undosStack[n] = [];
		}
		return undosStack[n];
	}

	get _redos() {
		if((typeof game === 'undefined') || !game.currentContainer) {
			return [];
		}
		let n = game.currentContainer.name;
		assert(n, 'currentContainer name is empty.');
		if(!redosStack.hasOwnProperty(n)) {
			redosStack[n] = [];
		}
		return redosStack[n];
	}

	_pushCurrentStateToUndoHistory(selectionData, selectionOnly) {
		assert(game.__EDITORmode, "Attempt to use history in running time.");

		let historyRecord = {};
		if(selectionOnly) {
			if(arraysEqual(selectionData, this.currentState.selectionData)) {
				return;
			}
			historyRecord.treeData = this.currentState.treeData;
		} else {
			historyRecord.treeData = Lib.__serializeObject(game.currentContainer);
			historyRecord.treeData._isModified = true;
		}

		lastAppliedTreeData = historyRecord.treeData;

		this._undos.push(historyRecord);
		this.currentState.selectionData = selectionData;

		//reduce and limit history
		if(this._undos.length > HISTORY_LEN) {
			let i = HISTORY_LEN - 1;
			while (i > STRICT_HISTORY_LEN) {
				i -= 2;
				this._undos.splice(i, 1);
			}
		}
		historyUi.forceUpdate();
	}

	addHistoryState(selectionOnly = false) {
		let selectionData = editor.selection.saveSelection();
		if(!selectionOnly) {
			this._redos.length = 0;
		}
		this._pushCurrentStateToUndoHistory(selectionData, selectionOnly);
	}
	
	undo() {
		if (this.isUndoAvailable()) {
			this._redos.push(this._undos.pop());
			applyState(this.currentState);
			historyUi.forceUpdate();
		}
	}
	
	redo() {
		if (this.isRedoAvailable()) {
			this._undos.push(this._redos.pop());
			applyState(this.currentState);
			historyUi.forceUpdate();
		}
	}
	
	get currentState() {
		let undos = this._undos;
		if(undos) {
			return undos[undos.length - 1];
		}
		return null;
	}
	
	clearHistory() {
		if(this._undos.length === 0 && this._redos.length === 0) {
			this.addHistoryState();
		}
		this.setCurrentStateUnmodified();
		historyUi.forceUpdate();
	}
	
	updateUi() {
		historyUi.forceUpdate();
	}
	
	setCurrentStateUnmodified() {
		this._undos.some((s) => {
			s.treeData._isModified = true;
		});
		this.currentState.treeData._isModified = false;
	}
	
	get isStateModified() {
		return this.currentState && this.currentState.treeData._isModified;
	}
	
	buttonsRenderer() {
		return React.createElement(HistoryUi);
	}
}

let modifiedStyle = {style: {borderBottom: '1px solid #f66'}};

class HistoryUi extends React.Component {
	constructor(props) {
		super(props);
		historyUi = this;
	}
	
	render() {
		if(!instance._undos) {
			return R.span();
		}
		return R.span(editor.isCurrentSceneModified ? modifiedStyle : null,
			R.btn('Undo', editor.history.undo, '(Ctrl + Z)', undefined, 1090, !instance.isUndoAvailable() || !game.__EDITORmode),
			instance._undos.length,
			R.btn('Redo', editor.history.redo, '(Ctrl + Y)', undefined, 1089, !instance.isRedoAvailable() || !game.__EDITORmode),
			instance._redos.length
		);
	}
}

function arraysEqual(a, b) {
	if(a === b) return true;
	if(a == null || b == null) return false;
	if(a.length != b.length) return false;

	for (var i = 0; i < a.length; ++i) {
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