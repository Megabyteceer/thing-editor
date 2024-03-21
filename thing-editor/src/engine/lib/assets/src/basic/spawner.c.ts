import { Container, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

const zeroPoint = new Point();

export default class Spawner extends Container {

	@editable({ type: 'prefab', important: true })
	prefabToSpawn: string | null = null;

	@editable()
	enabled = true;

	@editable({ min: 0 })
	interval = 0;

	@editable({ min: 0 })
	intervalRandom = 0;

	@editable()
	speed = 10;

	@editable()
	speedRandom = 10;

	@editable()
	applyRotation = false;

	@editable({ type: 'data-path', isValueValid: (o: any) => { return (o instanceof Container); } })
	container: string | null = null;

	@editable({ type: 'ref' })
	_container: Container | null = null;

	curInterval = 0;

	init() {
		super.init();
		this.curInterval = Math.round(Math.random() * this.intervalRandom);
	}

	enable() {
		this.enabled = true;
	}

	disable() {
		this.enabled = false;
	}

	setSpeed(speed: number) {
		this.speed = speed;
	}

	update() {
		if (this.enabled && this.worldVisible) {
			if (this.curInterval > 0) {
				this.curInterval--;
			} else {
				this.spawn();
				this.curInterval = this.getNextInterval();
			}
		}
		super.update();
	}

	getNextInterval() {
		if (this.intervalRandom > 0) {
			return this.interval + Math.round(Math.random() * this.intervalRandom);
		}
		return this.interval;
	}

	/// #if EDITOR
	___containerID = 0;
	/// #endif

	setTargetContainer(targetContainer: Container | string) {
		if (targetContainer) {
			this._container = (targetContainer instanceof Container) ? targetContainer : getValueByPath(targetContainer, this);
			/// #if EDITOR
			if (!this._container) {
				game.editor.ui.status.error('Spawner targeted to not existing container: ' + this.container, 32007, this, 'container');
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

	spawn() {
		/// #if EDITOR
		if (!this.prefabToSpawn) {
			game.editor.ui.status.error('Prefab to spawn is not selected.', 32005, this, 'prefabToSpawn');
			return;
		} else if (!Lib.hasPrefab(this.prefabToSpawn)) {
			game.editor.ui.status.error('Prefab with name "' + this.prefabToSpawn + '" is not exists.', 32006, this, 'prefabToSpawn');
			return;
		}
		/// #endif
		if (!this._container) {
			this.setTargetContainer(this.container as string);
		}
		/// #if EDITOR
		if (this.___containerID !== this._container!.___id) {
			game.editor.ui.status.error('Spawner\'s target container has been removed. Please disable spawner before removing target container or use not removable target container.', 32056, this, 'container');
			this.disable();
			return;
		}
		if (this._container?.worldTransform.a === 0 || this._container?.worldTransform.d === 0) {
			game.editor.ui.status.error('Spawner\'s target container has zero scale. Impossible to calculate target point.', 99999, this, 'container');
			this.disable();
			return;
		}
		/// #endif

		let o = Lib.loadPrefab(this.prefabToSpawn);
		if (this.applyRotation) {
			o.rotation = this.getGlobalRotation();
		}


		this._container!.addChild(o);
		o.parent.toLocal(zeroPoint, this, o);

		if (this.speed !== 0 || this.speedRandom !== 0) {
			let sp = this.speed + Math.random() * this.speedRandom;
			spawnPoint.x = sp;
			o.parent.toLocal(spawnPoint, this, spawnPointRet, true);
			(o as DSprite).xSpeed = spawnPointRet.x - o.x;
			(o as DSprite).ySpeed = spawnPointRet.y - o.y;
		}
	}

	onRemove(): void {
		this._container = null;
		super.onRemove();
	}
}

const spawnPoint = new Point();
const spawnPointRet = new Point();

/// #if EDITOR

(Spawner.prototype.enable as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spawner.prototype.disable as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spawner.prototype.spawn as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spawner.prototype.setSpeed as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

Spawner.__EDITOR_icon = 'tree/spawner';

/// #endif
