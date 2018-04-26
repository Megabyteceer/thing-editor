var undos = [], redos = [];

function getCurrentState() {
    assert(game.__EDITORmode, "Attempt to use history in running time.");
    return Lib.__serializeObject(game.currentScene);
}

function applyState(state) {
    EDITOR.applyScene(Lib._deserializeObject(state));
}

function pushCurrentStateToUndoHistory() {
    if(!game.__EDITORmode) {
        undos.push(Lib.scenes[EDITOR.runningSceneLibSaveSlotName]);
    } else {
        undos.push(getCurrentState());
    }
}

class History {

    addHistoryState() {
        debugger;
        redos.length = 0;
        pushCurrentStateToUndoHistory();
        console.log('History saved');
    }

    undo() {
        debugger;
        if(undos.length > 0) {
            redos.push(getCurrentState());
            applyState(undos.pop());
        }
    }

    redo() {
        debugger;
        if(redos.length > 0) {
            pushCurrentStateToUndoHistory();
            applyState(redos.pop());
        }
    }

    clearHistory() {
        debugger;
        undos.length = 0;
        redos.length = 0;
    }
}

var historyInstance = new History();

export default historyInstance;