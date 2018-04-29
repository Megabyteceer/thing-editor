const HISTORY_LEN = 50;
const STRICT_HISTORY_LEN = 10;

var undos = [], redos = [];
var historyUi;

function applyState(state) {
    assert(state, 'Empty history record');

    var scene = Lib._loadObjectFromData(state);
    assert(game.__EDITORmode);
    game.showScene(scene);
    EDITOR.selection.loadSelection(state.selectionData);
}

function  isRedoAvailable() {
    return redos.length > 0;
}

function  isUndoAvailable() {
    return undos.length > 1;
}

class History {
    
    constructor(){
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
    }
    
    _pushCurrentStateToUndoHistory(selectionData) {
        if(!game.__EDITORmode) {
            assert(Lib.hasScene(EDITOR.runningSceneLibSaveSlotName), "");
            undos.push(Lib.scenes[EDITOR.runningSceneLibSaveSlotName]);
        } else {
            assert(game.__EDITORmode, "Attempt to use history in running time.");
            undos.push(Lib.__serializeObject(game.currentScene));
        }
        this.currentState._isModified = true;
        this.currentState.selectionData = selectionData;
        
        //reduce and limit history
        if(undos.length > HISTORY_LEN) {
            var i = HISTORY_LEN - 1;
            while (i > STRICT_HISTORY_LEN) {
                i -= 2;
                undos.splice(i, 1);
            }
        }
        historyUi.forceUpdate();
    }
    
    addHistoryState() {
        var selectionData = EDITOR.selection.saveSelection();
        redos.length = 0;
        this._pushCurrentStateToUndoHistory(selectionData);
        console.log('History saved');
    }

    undo() {
        if(isUndoAvailable()) {
            redos.push(undos.pop());
            applyState(this.currentState);
            historyUi.forceUpdate();
        }
    }

    redo() {
        if(isRedoAvailable()) {
            undos.push(redos.pop());
            applyState(this.currentState);
            historyUi.forceUpdate();
        }
    }

    get currentState() {
        return undos[undos.length - 1];
    }

    clearHistory(currentState) {
        undos.length = 0;
        redos.length = 0;
        this.addHistoryState();
        historyUi.forceUpdate();
    }

    setCurrentStateUnmodified() {
        undos.some((s)=> {
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

var modifiedStyle = { style:{borderBottom:'1px solid #f66'}};

class HistoryUi extends React.Component {
    constructor(props) {
        super(props);
        historyUi = this;
    }

    render() {
        return R.span(EDITOR.currentSceneIsModified ? modifiedStyle: null,
            R.btn('Undo', EDITOR.history.undo, '(Ctrl + Z)', undefined, 1090, !isUndoAvailable()),
            undos.length,
            R.btn('Redo', EDITOR.history.redo, '(Ctrl + Y)', undefined, 1089, !isRedoAvailable()),
            redos.length
        );
    }
}


var historyInstance = new History();

export default historyInstance;