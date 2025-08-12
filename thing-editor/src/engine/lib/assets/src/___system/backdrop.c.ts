import type { Renderer } from 'pixi.js';
import { Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { PREFAB_PIVOT } from 'thing-editor/src/editor/ui/viewport';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

const zeroPoint = new Point();
const p = new Point();

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

		if (this.isFixedStageFrame) { // safe frame
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = (game.isPortrait ? game.projectDesc.portraitWidth : game.projectDesc.width) * game.stage.scale.x;
			this.height = (game.isPortrait ? game.projectDesc.portraitHeight : game.projectDesc.height) * game.stage.scale.y;
			if (PrefabEditor.currentPrefabName) {
				this.x -= (game.W * game.stage.scale.x) / 2;
				this.y -= (game.H * game.stage.scale.x) / 2;
			}
			this.x += (game.W * game.stage.scale.x - this.width) / 2;
			this.y += (game.H * game.stage.scale.y - this.height) / 2;
		} else if (this.isStageFrame) { //screen frame
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = game.W * game.stage.scale.x;
			this.height = game.H * game.stage.scale.y;
			if (PrefabEditor.currentPrefabName) {
				this.x -= this.width / 2;
				this.y -= this.height / 2;
			}
		} else { //prefab editor back drop
			this.parent.toLocal(zeroPoint, game.stage.parent, this, false);
			p.x = game.W;
			p.y = game.H;
			this.toLocal(p, game.stage.parent, p, false);
			this.width = p.x;
			this.height = p.y;

		}
		if (PrefabEditor.currentPrefabName && (this.isFixedStageFrame || this.isStageFrame)) {
			switch (PrefabEditor.pivot) {
			case PREFAB_PIVOT.LEFT_TOP:
				this.x += game.W / 2 * game.stage.scale.x;
				this.y += game.H / 2 * game.stage.scale.x;
				break;
			}
		}

		this.updateTransform();
		super.render(renderer);
	}
}
