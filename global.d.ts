interface Game {
    isPortrait: boolean;
}

import { DisplayObject } from 'pixi.js-legacy';
import Editor from 'thing-editor/js/editor/editor.js';
import {Game} from 'thing-editor/js/engine/game.js';
import Container from './js/engine/components/container';


class TEditor extends Editor {
	game:Game;
	_root_initCalled:boolean;
	_root_onRemovedCalled:boolean;
}

declare global {
	var editor: TEditor;
	function assert(expression: boolean, message?: string, errorCode?: number);
	function __getNodeExtendData(node:Container): any
}