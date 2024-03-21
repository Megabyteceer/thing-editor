import { Container, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

const zeroPoint = new Point();

const PI2 = Math.PI * 2.0;

export default class SpawnerRing extends Container {

	@editable({ type: 'prefab', important: true })
	prefabToSpawn: string | null = null;

	@editable()
	speed = 10;

	@editable()
	speedRandom = 10;

	@editable()
	count = 10;

	@editable()
	countRandom = 10;

	@editable()
	radius = 10;


	@editable({ type: 'data-path', isValueValid: (o: any) => { return (o instanceof Container); } })
	container: string | null = null;

	@editable({ type: 'ref' })
	_container: Container | null = null;

	/// #if EDITOR
	___containerID = 0;
	/// #endif

	spawn() {
		/// #if EDITOR
		if (!this.prefabToSpawn) {
			game.editor.ui.status.error('Prefab to spawn is not selected.', 30015, this, 'prefabToSpawn');
			return;
		} else if (!Lib.hasPrefab(this.prefabToSpawn)) {
			game.editor.ui.status.error('Prefab with name "' + this.prefabToSpawn + '" is not exists.', 30016, this, 'prefabToSpawn');
			return;
		}
		/// #endif
		if (!this._container) {
			if (this.container) {
				this._container = getValueByPath(this.container, this);
				/// #if EDITOR
				if (!this._container) {
					game.editor.ui.status.error('Spawner targeted to not existing container: ' + this.container, 30017, this, 'container');
					this._container = game.currentContainer;
				}
				/// #endif
			} else {
				this._container = game.currentContainer;
			}
			/// #if EDITOR
			this.___containerID = this._container.___id;
			/// #endif
		}

		/// #if EDITOR
		if (this.___containerID !== this._container.___id) {
			game.editor.ui.status.error('SpawnerRing\'s target container has been removed. Please disable spawner before removing target container or use not removable target container.', 32055, this, 'container');
			return;
		}
		/// #endif

		this._container.toLocal(zeroPoint, this, spawnPoint);
		let step = PI2 / (this.count + (this.countRandom * Math.random()));
		for (let i = 0; i < PI2; i += step) {
			let sin = Math.sin(i);
			let cos = Math.cos(i);

			let o = Lib.loadPrefab(this.prefabToSpawn);
			this._container.addChild(o);
			o.x = spawnPoint.x + this.radius * cos;
			o.y = spawnPoint.y + this.radius * sin;
			let sp = this.speed + Math.random() * this.speedRandom;
			(o as DSprite).xSpeed = sp * cos;
			(o as DSprite).ySpeed = sp * sin;
		}
	}

	onRemove(): void {
		this._container = null;
		super.onRemove();
	}
}

const spawnPoint = new Point();

/// #if EDITOR

(SpawnerRing.prototype.spawn as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

SpawnerRing.__EDITOR_icon = 'tree/spawner-ring';

/// #endif
