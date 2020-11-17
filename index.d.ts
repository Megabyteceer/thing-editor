/// <reference path="node_modules/pixi.js-legacy/pixi.js-legacy.d.ts" />

import 'current-project-typings.js';
import Editor from 'thing-editor/js/editor/editor.js';
import game from 'thing-editor/js/engine/game.js';

import Container from './js/engine/components/container';


class TEditor extends Editor {
	game:typeof game;
	_root_initCalled:boolean;
	_root_onRemovedCalled:boolean;
}

declare global {
	interface GameDataModel {
	}

	/** @see https://github.com/Megabyteceer/thing-editor/wiki/ProjectSettings */
	interface ThingProjectSettings {
		defaultFont: string;
		screenOrientation: "auto"|"landscape"|"portrait";
		width: number;
		height: number;
		portraitWidth: number;
		portraitHeight: number;
		renderResolution: number;
		renderResolutionMobile: number;
		framesSkipLimit: number;
		dynamicStageSize: boolean;
		preventUpscale: boolean;
		muteOnFocusLost: boolean;
		mipmap: boolean;
		version: string;
		soundFormats: string[];
		soundDefaultBitrate: number;
		defaultMusVol: number;
		defaultSoundsVol: number;
		keepSoundWhilePageUpdate: boolean;
		autoFullscreenDesktop: boolean;
		autoFullscreenMobile: boolean;
	}
}

declare global {
	var editor: TEditor;
	function assert(expression: boolean, message?: string, errorCode?: number);
	function __getNodeExtendData(node:Container): any;

}