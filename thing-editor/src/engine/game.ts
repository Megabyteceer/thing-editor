/// #if EDITOR
import Editor from "thing-editor/src/editor/editor";
/// #if EDITOR

import * as PIXI from "pixi.js";
import type { Classes } from "thing-editor/src/editor/env";
import Container, { ContainerType } from "thing-editor/src/engine/components/container.c";
import Scene from "thing-editor/src/engine/components/scene.c";
import { DisplayObjectType } from "thing-editor/src/engine/display-object";

let app: PIXI.Application;
let stage: ContainerType;
let __currentSceneValue: Scene;
let modals: ContainerType[] = [];

class Game {

	/// #if EDITOR
	//@ts-ignore
	editor: Editor;
	__EDITOR_mode = false;
	/// #endif

	classes: Classes = {};

	app?: PIXI.Application;

	stage: ContainerType | undefined;

	init() {
		this.app = app = new PIXI.Application();
		//@ts-ignore

		document.body.appendChild(app.view);

		stage = new Container();
		stage.name = 'stage';
		this.stage = stage;


		app.stage.addChild(stage);

		PIXI.Assets.load(this.editor.currentGame + 'assets/bunny.png').then((texture) => {

			// This creates a texture from a 'bunny.png' image
			const bunny = new PIXI.Sprite(texture);

			// Setup the position of the bunny
			bunny.x = app.renderer.width / 2;
			bunny.y = app.renderer.height / 2;

			// Rotate around the center
			bunny.anchor.x = 0.5;
			bunny.anchor.y = 0.5;

			// Add the bunny to the scene we are building
			app.stage.addChild(bunny);

			// Listen for frame updates
			app.ticker.add(() => {
				// each frame we spin the bunny around a bit
				bunny.rotation += 0.01;
			});
		});
	}

	get currentContainer(): ContainerType {
		if(modals.length > 0) {
			return modals[modals.length - 1]; //top modal is active
		}
		return this.currentScene; //current scene is active if no modals on screen
	}

	get currentScene() {
		return __currentSceneValue;
	}

	/// #if EDITOR
	__setCurrentContainerContent(_o: DisplayObjectType) {
		//TODO:
	}

	/// #endif

}

const game = new Game();
export default game;

export { Game, PIXI }
