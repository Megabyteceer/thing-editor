
import {
	Component
} from "preact";

import R from "./preact-fabrics";

import * as PIXI from "pixi.js";
import game, { Game } from "../engine/game";

import ClassesLoader from "./classes-loader";

interface EditorProps {
	recId: number;
}
interface EditorState {
	message: string;
}

let app: PIXI.Application;

export default class Editor extends Component<EditorProps, EditorState> {

	game: Game;
	currentGame = '/games/game1/'

	constructor() {
		super();
		this.game = game;
		game.editor = this;
		this.game.init();
	}

	componentDidMount() {
		ClassesLoader.reloadClasses();
		app = new PIXI.Application();
		//@ts-ignore
		document.body.appendChild(app.view);



		PIXI.Assets.load(this.currentGame + 'assets/bunny.png').then((texture) => {

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
		return R.span(null, state.message,
			R.button({
				className: 'clickable',
				onClick: () => {
					ClassesLoader.reloadClasses();
				}
			},
				'ok')
		)
	}
}
