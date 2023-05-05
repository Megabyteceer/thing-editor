/// #if EDITOR
import Editor from "thing-editor/src/editor/editor";
/// #if EDITOR

import * as PIXI from "pixi.js";
import type { Classes, SelectableProperty } from "thing-editor/src/editor/env";
import Container, { ContainerType } from "thing-editor/src/engine/components/container.c";
import Scene from "thing-editor/src/engine/components/scene.c";
import { DisplayObjectType } from "thing-editor/src/engine/display-object";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import assert from "thing-editor/src/engine/debug/assert";

let app: PIXI.Application;
let stage: ContainerType;
let __currentSceneValue: Scene;
let modals: ContainerType[] = [];

class Game {

	projectDesc!: ProjectDesc;

	applyProjectDesc(projectDescriptor: ProjectDesc) {
		let def: ProjectDesc = {
			defaultFont: 'Arial',
			screenOrientation: "landscape",
			width: 1280,
			height: 720,
			portraitWidth: 408,
			portraitHeight: 720,
			renderResolution: 1,
			renderResolutionMobile: 1,
			framesSkipLimit: 4,
			dynamicStageSize: false,
			preventUpscale: false,
			webfontloader: null,
			fontHolderText: 'ЯSфz',
			mipmap: false,
			version: "0.0.1",
			soundFormats: [
				"ogg",
				"aac"
			],
			soundDefaultBitrate: 96,
			soundBitrates: {
			},
			loadOnDemandSounds: {
			},
			loadOnDemandTextures: {
			},
			__loadOnDemandTexturesFolders: {

			},
			defaultMusVol: 1,
			defaultSoundsVol: 1,
			embedLocales: true,
			__localesNewKeysPrefix: '',
			__externalTranslations: [],
			autoFullscreenDesktop: false,
			autoFullscreenMobile: false,
			__proxyFetchesViaNodeServer: false,
			__group: '',
			__webpack: {
				debug: 'config/webpack.debug.js',
				production: 'config/webpack.prod.js'
			},
			jpgQuality: 95,
			pngQuality: [0.95, 1]
		};
		let isModified = false;
		for(let name in def) {
			if(!projectDescriptor.hasOwnProperty(name)) {
				projectDescriptor[name] = def[name];
				isModified = true;
			}
		}

		let so = projectDescriptor.screenOrientation;
		assert(so === 'auto' || so === 'landscape' || so === 'portrait', 'Wrong value for "screenOrientation". "auto", "landscape" or "portrait" expected', 30010);

		PIXI.settings.MIPMAP_TEXTURES = projectDescriptor.mipmap
			? PIXI.MIPMAP_MODES.ON
			: PIXI.MIPMAP_MODES.OFF;

		PIXI.settings.GC_MODE = PIXI.GC_MODES.MANUAL;

		this.projectDesc = projectDescriptor;
		this.onResize();
		return isModified;
	}

	onResize() {
		//TODO:
	}

	/// #if EDITOR

	editor!: Editor;
	__EDITOR_mode = false;
	/// #endif

	classes!: Classes;
	app!: PIXI.Application;
	stage!: ContainerType;

	init(element: HTMLElement | null, _gameId: string, _resourcesPath = '') {
		this.app = app = new PIXI.Application();
		//@ts-ignore

		(element || document.body).appendChild(app.view);

		stage = new Container();
		stage.name = 'stage';
		this.stage = stage;


		app.stage.addChild(stage);

		PIXI.Assets.load(this.editor.currentProjectDir + 'assets/bunny.png').then((texture) => {

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

(Game.prototype.applyProjectDesc as SelectableProperty).___EDITOR_isHiddenForChooser = true;