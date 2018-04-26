const HISTORY_LEN = 50;
const STRICT_HISTORY_LEN = 10;

var undos = [], redos = [];



function getCurrentState() {
    assert(game.__EDITORmode, "Attempt to use history in running time.");
    return Lib.__serializeObject(game.currentScene);
}

function applyState(state) {
    assert(state, 'Empty history record');
    EDITOR.applyScene(Lib._loadObjectFromData(state));
}

function pushCurrentStateToUndoHistory() {
    if(!game.__EDITORmode) {
        assert(Lib.hasScene(EDITOR.runningSceneLibSaveSlotName));
        undos.push(Lib.scenes[EDITOR.runningSceneLibSaveSlotName]);
    } else {
        undos.push(getCurrentState());
    }
    
    //reduce and limit history
    if(undos.length > HISTORY_LEN) {
        var i = HISTORY_LEN - 1;
        while (i > STRICT_HISTORY_LEN) {
            i -= 2;
            undos.splice(i, 1);
        }
    }
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
        redos.length = 0;
        clearDebouncing();
        timeout = setTimeout(() => {
            pushCurrentStateToUndoHistory();
            console.log('History saved');
            timeout = false;
        }, 100);
    }

    undo() {
        if(undos.length > 1) {
            if(timeout) {
                clearDebouncing();
                return;
            }
            redos.push(undos.pop());
            applyState(undos[undos.length - 1]);
        }
    }

    redo() {
        if(redos.length > 0) {
            clearDebouncing();
            undos.push(redos.pop());
            applyState(undos[undos.length - 1]);
        }
    }

    clearHistory(currentState) {
        undos.length = 0;
        redos.length = 0;
        undos.push(currentState);
    }
}

var historyInstance = new History();

export default historyInstance;