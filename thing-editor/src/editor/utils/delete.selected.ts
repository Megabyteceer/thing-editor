import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";


export namespace editorUtils {
	export const deleteSelected = () => {

		const editor = game.editor;

		if((editor.selection.length > 0) && (editor.selection[0] !== game.currentContainer)) {

			//TODO DataPathFixer.rememberPathReferences();

			let p = editor.selection[0].parent;
			let i = p.getChildIndex(editor.selection[0]);

			while(editor.selection.length > 0) {
				let o = editor.selection[0];
				Lib.__invalidateSerializationCache(o);
				o.remove();
			}

			let isAnotherNodeSelected = false;

			while(i < p.children.length) {
				let c = p.getChildAt(i++);
				if(!getParentWhichHideChildren(c, true)) {
					editor.ui.sceneTree.selectInTree(c);
					isAnotherNodeSelected = true;
					break;
				}
			}
			i--;
			if(!isAnotherNodeSelected) {
				while(i >= 0) {
					let c = p.getChildAt(i--);
					if(!getParentWhichHideChildren(c, true)) {
						editor.ui.sceneTree.selectInTree(c);
						isAnotherNodeSelected = true;
						break;
					}
				}
			}

			if(!isAnotherNodeSelected && (p !== game.stage)) {
				editor.ui.sceneTree.selectInTree(p);
			}

			//TODO DataPathFixer.validatePathReferences();

			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}
}