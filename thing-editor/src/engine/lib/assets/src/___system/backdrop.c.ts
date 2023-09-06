import { Point, Renderer } from "pixi.js";
import editable from "thing-editor/src/editor/props-editor/editable";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import game from "thing-editor/src/engine/game";
import Shape from "thing-editor/src/engine/lib/assets/src/extended/shape.c";

const zeroPoint = new Point();

export default class __SystemBackDrop extends Shape {

	@editable()
	isStageFrame = false;

	@editable({ name: 'x', notSerializable: true, override: true })
	@editable({ name: 'y', notSerializable: true, override: true })
	@editable({ name: 'width', notSerializable: true, override: true })
	@editable({ name: 'height', notSerializable: true, override: true })

	render(renderer: Renderer): void {

		if(this.isStageFrame) {
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = game.W * game.stage.scale.x;
			this.height = game.H * game.stage.scale.y;
			if(PrefabEditor.currentPrefabName) {
				this.x -= this.width / 2;
				this.y -= this.height / 2;
			}
		} else {
			this.parent.toLocal(zeroPoint, game.stage.parent, this, false);

			this.width = game.W / game.stage.scale.x;
			this.height = game.H / game.stage.scale.y;

		}
		this.updateTransform();
		super.render(renderer);
	}
}