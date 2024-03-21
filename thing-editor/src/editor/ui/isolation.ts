import type { Container } from 'pixi.js';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import game from 'thing-editor/src/engine/game';


const toggleIsolation = () => {
	if (EDITOR_FLAGS.isolationEnabled) {
		exitIsolation();
	} else {
		isolateSelected();
	}
};

const isolateSelected = () => {
	EDITOR_FLAGS.isolationEnabled = true;

	game.forAllChildrenEverywhere(isolateObject);
	for (let o of game.editor.selection) {
		unIsolateObject(o);
		o.forAllChildren(unIsolateObject);
		let p = o.parent;
		while (p) {
			unIsolateObject(p);
			p = p.parent;
			if (!p.parent.__nodeExtendData.isolate) {
				break;
			}
		}
	}
	game.editor.refreshTreeViewAndPropertyEditor();
};

const exitIsolation = () => {
	if (EDITOR_FLAGS.isolationEnabled) {
		EDITOR_FLAGS.isolationEnabled = false;
		game.forAllChildrenEverywhere(unIsolateObject);
		game.editor.refreshTreeViewAndPropertyEditor();
	}
};

const isolateObject = (o: Container) => {
	o.__nodeExtendData.isolate = true;
};

const unIsolateObject = (o: Container) => {
	o.__nodeExtendData.isolate = false;
};

export { exitIsolation, toggleIsolation };

