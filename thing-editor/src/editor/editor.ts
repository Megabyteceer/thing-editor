import {
	Component
} from "preact";
import R from "./preact-fabrics";

import * as PIXI from "pixi.js";
import fs from "./fs";
import { EditablePropertyDesc } from "./props-editor/editable";
import assert from "../engine/utils/assert";
import game, { Game } from "../engine/game";
import { ThingEditorServer } from "../env";

const thingEditorServer: ThingEditorServer = window.thingEditorServer;

const versionsInfo = Object.entries(thingEditorServer.versions).map(e => R.div(null, R.span({
	'className': 'version-header'
}, e[0]), ': ', e[1]));

interface EditorProps {
	recId: number;
}
interface EditorState {
	message: string;
}

let componentsVersion = Date.now();
let app: PIXI.Application;

export default class Editor extends Component<EditorProps, EditorState> {

	game: Game;

	constructor() {
		super();
		window.editor = this;
		this.game = game;
		this.game.init();
		this.game.editor = this;
	}

	componentDidMount() {
		app = new PIXI.Application();
		//@ts-ignore
		document.body.appendChild(app.view);



		PIXI.Assets.load('assets/bunny.png').then((texture) => {

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
			this.setState({
				message: 'Thing-Editor 2.0 Hello!'
			});
		});
	}
	render(_props: EditorProps, state: EditorState) {
		return R.span(null, state.message, versionsInfo,
			R.button({
				className: 'clickable',
				onClick: () => {
					componentsVersion++;
					let files = fs.readDir('thing-editor/src/engine/components');
					Promise.all(files.filter(file => file.name.endsWith('.c.ts') || file.name.endsWith('.s.ts')).map((file) => {
						const moduleName = file.name.replace(/\.ts$/, '');
						return import(/* @vite-ignore */`/${moduleName}.ts?v=${componentsVersion}`).then((module) => {

							game.alert();
							const Class = module.default;
							let c = new Class();
							c.init();
							app.stage.addChild(c);
							Class.__sourceFileName = file.name;
							const editableProps: EditablePropertyDesc[] = c.__editableProps;
							for(let prop of editableProps) {

								if(!prop.hasOwnProperty('default')) {
									prop.default = c[prop.name];
								}
								if(!prop.hasOwnProperty('type')) {
									let type = typeof c[prop.name];
									assert(type === 'string' || type === 'number', 'invalid type "' + type + '" for editable property ' + prop.name);
									//@ts-ignore
									prop.type = type;
								}
							}
							return Class;
						});
					})).then((_classes) => {

					});
				}
			},
				'ok')
		)
	}
}

export {
	thingEditorServer
};