import type { Renderer } from 'pixi.js';
import { Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

const zeroPoint = new Point();

export default class __SystemBackDrop extends Shape {

	@editable()
	isStageFrame = false;

	@editable()
	isFixedStageFrame = false;

	@editable({ name: 'x', notSerializable: true, override: true, disabled: () => true })
	@editable({ name: 'y', notSerializable: true, override: true, disabled: () => true })
	@editable({ name: 'width', notSerializable: true, override: true, disabled: () => true })
	@editable({ name: 'height', notSerializable: true, override: true, disabled: () => true })

	render(renderer: Renderer): void {

		if (this.isFixedStageFrame) {
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = (game.isPortrait ? game.projectDesc.portraitWidth : game.projectDesc.width) * game.stage.scale.x;
			this.height = (game.isPortrait ? game.projectDesc.portraitHeight : game.projectDesc.height) * game.stage.scale.y;
			if (PrefabEditor.currentPrefabName) {
				this.x -= this.width / 2;
				this.y -= this.height / 2;
			}
			this.x += (game.W * game.stage.scale.x - this.width) / 2;
			this.y += (game.H * game.stage.scale.y - this.height) / 2;
		} else if (this.isStageFrame) {
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = game.W * game.stage.scale.x;
			this.height = game.H * game.stage.scale.y;
			if (PrefabEditor.currentPrefabName) {
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
