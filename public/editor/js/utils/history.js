const HISTORY_LEN = 50;
const STRICT_HISTORY_LEN = 10;

var undos = [], redos = [];
var historyUi;

function applyState(state) {
    assert(state, 'Empty history record');

    var scene = Lib._loadObjectFromData(state);
    assert(game.__EDITORmode);
    game.showScene(scene);
    this.selection.loadSelection(state.selectionData);
    this.refreshTreeViewAndPropertyEditor();
}

function pushCurrentStateToUndoHistory(selectionData) {
    if(!game.__EDITORmode) {
        assert(Lib.hasScene(EDITOR.runningSceneLibSaveSlotName));
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
}

function  isRedoAvailable() {
    redos.length > 0;
}

function  isUndaAvailable() {
    return undos.length > 1;
}

var timeout;
var clearDebouncing = () => {
    if(timeout) {
        clearTimeout(timeout);
        timeout = false;
    }
}
class History {

    addHistoryState() {
        var selectionData = this.selection.saveSelection();
        redos.length = 0;
        clearDebouncing();
        timeout = setTimeout(() => {
            pushCurrentStateToUndoHistory(selectionData);
            console.log('History saved');
            timeout = false;
        }, 100);
        historyUi.forceUpdate();
    }

    undo() {
        if(isUndaAvailable()) {
            if(timeout) {
                clearDebouncing();
                return;
            }
            redos.push(undos.pop());
            applyState(this.currentState);
            historyUi.forceUpdate();
        }
    }

    redo() {
        if(isRedoAvailable()) {
            clearDebouncing();
            undos.push(redos.pop());
            applyState(this.currentState);
            historyUi.forceUpdate();
        }
    }

    get currentState(){
        return undos[undos.length - 1];
    }

    clearHistory(currentState) {
        undos.length = 0;
        redos.length = 0;
        undos.push(currentState);
        historyUi.forceUpdate();
    }

    setCurrentStateUnmodified() {
        undos.some((s)=> {
            s._isModified = false;
        });
        this.currentState._isModified = true;
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
            R.btn('Undo', EDITOR.history.undo, undefined, undefined, 90, !isUndaAvailable()),
            R.btn('Redo', EDITOR.history.redo, undefined, undefined, 89, !isRedoAvailable())
        );
    }
}


var historyInstance = new History();

export default historyInstance;