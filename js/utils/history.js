import Lib from "/thing-engine/js/lib.js";
import game from "/thing-engine/js/game.js";

const HISTORY_LEN = 50;
const STRICT_HISTORY_LEN = 10;

let undosStack = []; //separated undo/redo array for scene and each modal objects
let redosStack = [];
let historyUi;

let instance;

function applyState(state) {
	assert(state, 'Empty history record');
	
	let node = Lib._deserializeObject(state);
	assert(game.__EDITORmode);
	game.__setCurrentContainerContent(node);
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
		return this._redos.length > 0;
	}

	isUndoAvailable() {
		return this._undos && this._undos.length > 1;
	}

	get _undos() {
		if(typeof game === 'undefined') {
			return [];
		}
		let l = game.modalsCount + 1;
		if(undosStack.length > l) {
			undosStack.length = l;
		} else if (undosStack.length < l) {
			undosStack.push([]);
		}
		return undosStack[game.modalsCount];
	}

	get _redos() {
		if(typeof game === 'undefined') {
			return [];
		}
		let l = game.modalsCount + 1;
		if(redosStack.length > l) {
			redosStack.length = l;
		} else if (redosStack.length < l) {
			redosStack.push([]);
		}
		return redosStack[game.modalsCount];
	}

	_pushCurrentStateToUndoHistory(selectionData) {
		assert(game.__EDITORmode, "Attempt to use history in running time.");
		this._undos.push(Lib.__serializeObject(game.currentContainer));

		this.currentState._isModified = true;
		this.currentState.selectionData = selectionData;
		
		//reduce and limit history
		if (this._undos.length > HISTORY_LEN) {
			let i = HISTORY_LEN - 1;
			while (i > STRICT_HISTORY_LEN) {
				i -= 2;
				this._undos.splice(i, 1);
			}
		}
		historyUi.forceUpdate();
	}
	
	addHistoryState() {
		let selectionData = editor.selection.saveSelection();
		this._redos.length = 0;
		this._pushCurrentStateToUndoHistory(selectionData);
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
	}
	
	clearHistory() {
		this._undos.length = 0;
		this._redos.length = 0;
		this.addHistoryState();
		historyUi.forceUpdate();
	}
	
	updateUi() {
		historyUi.forceUpdate();
	}
	
	setCurrentStateUnmodified() {
		this._undos.some((s) => {
			s._isModified = true;
		});
		this.currentState._isModified = false;
	}
	
	get isStateModified() {
		return this.currentState && this.currentState._isModified;
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


let historyInstance = new History();

export default historyInstance;