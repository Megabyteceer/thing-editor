import { ClassAttributes, ComponentChild } from "preact";
import ClassesLoader from "thing-editor/src/editor/classes-loader";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import "thing-editor/src/editor/ui/editor-overlay";
import game from "thing-editor/src/engine/game";

interface ViewportProps extends ClassAttributes<Viewport> {

}

export default class Viewport extends ComponentDebounced<ViewportProps> {

	stopExecution() {
		//TODO:
	}

	onDoubleClick() {
		//TODO:
	}

	onDragOver() {
		//TODO:
	}

	onDrop() {
		//TODO:
	}

	resetZoom() {
		game.stage.scale.x = 1;
		game.stage.scale.y = 1;
		game.stage.x = 0;
		game.stage.y = 0;
	}


	refreshCameraFrame() {
		//TODO
		/*
		if(game.stage.scale.x !== 1 || game.stage.x !== 0 || game.stage.y !== 0) {
			game.stage.addChild(cameraFrame); //move frame to front
			__getNodeExtendData(cameraFrame).hidden = true;

			if(cameraFrame.__appliedW !== game.W ||
				cameraFrame.__appliedH !== game.H) {

				const W = 40;
				cameraFrame.clear();
				cameraFrame.lineStyle(W, 0x808080, 0.4);
				cameraFrame.beginFill(0, 0);
				cameraFrame.drawRect(W / -2, W / -2, game.W + W, game.H + W);

				cameraFrame.__appliedW = game.W;
				cameraFrame.__appliedH = game.H;
			}
		} else {
			cameraFrame.detachFromParent();
		}*/
	}

	render(): ComponentChild {
		let className = 'editor-viewport-wrapper';

		return R.div({ className },
			R.div(null,
				R.btn('reload classes', () => { ClassesLoader.reloadClasses(); })
			),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport',
				onDoubleClick: this.onDoubleClick,
				onDragOver: this.onDragOver,
				onDrop: this.onDrop,
			})
		)
	}

}