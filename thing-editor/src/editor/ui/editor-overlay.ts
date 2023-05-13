/*import game from "thing-editor/src/engine/game";

window.addEventListener('mousedown', function onMouseDown(ev: MouseEvent) {
	if(game.pixiApp && (ev.target === game.pixiApp.view)) {
		if(ev.buttons === 4) {
			isScrolling = true;
			scrollingX = game.mouse.__EDITOR_x;
			scrollingY = game.mouse.__EDITOR_y;
		} else {
			if(overedDragger) {
				if(overedDragger instanceof Rotator && ev.buttons === 2) {
					editor.onSelectedPropsChange('rotation', 0);
				} else if(ev.buttons === 1 || ev.buttons === 2) {
					draggingDragger = overedDragger;
				}
			} else if(!selectionDisabled && ev.buttons === 1) {
				selectByStageClick(ev);
			} else if(!selectionDisabled && ev.buttons === 2 && editor.selection.length > 0) {
				let info = __getNodeExtendData(editor.selection[0]);
				if(info.draggerPivot && info.draggerPivot.owner.parent) {
					draggingDragger = info.draggerPivot;
				}
			}
			if(draggingDragger) {
				startX = draggingDragger.x;
				startY = draggingDragger.y;
				if(ev.buttons === 2) {
					shiftX = 0;
					shiftY = 0;
				} else {
					shiftX = draggingDragger.x - game.mouse.__EDITOR_x;
					shiftY = draggingDragger.y - game.mouse.__EDITOR_y;
				}
				if(ev.altKey) {
					let clone = editor.cloneSelected(draggingDragger.owner);
					if(clone) {
						refreshDraggersForNode(clone);
						if(__getNodeExtendData(draggingDragger.owner).draggerPivot === draggingDragger) {
							draggingDragger = __getNodeExtendData(clone).draggerPivot;
						} else {
							draggingDragger = __getNodeExtendData(clone).draggerRotator;
						}
					} else {
						draggingDragger = null;
						return;
					}
				}
				draggingDragger.onDrag(ev);
			}
		}
	}
});
*/