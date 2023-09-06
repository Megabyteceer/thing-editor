import { Component } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import game from "thing-editor/src/engine/game";

const transparentProps = { className: 'transparent' };

export default class StatusBar extends Component {

	interval!: number;

	componentDidMount(): void {
		this.interval = setInterval(() => {
			this.forceUpdate();
		}, 50);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	render() {
		if(game && game.stage) {
			let txt = ' x: ' + game.__mouse_uncropped.x + ' y: ' + game.__mouse_uncropped.y;

			if(game.editor.selection.length > 0) {
				let p = game.editor.selection[0].toLocal(game.mouse);
				txt += ' (x: ' + Math.round(p.x - game.editor.selection[0].pivot.x) + '; y: ' + Math.round(p.y - game.editor.selection[0].pivot.y) + ')';
			}

			let resetZoomBtn;
			if(game.stage) {
				if(game.stage.scale.x !== 1) {
					txt += ' zoom: ' + game.stage.scale.x;
				}

				const defaultCameraX = PrefabEditor.currentPrefabName ? game.W / 2 : 0;
				const defaultCameraY = PrefabEditor.currentPrefabName ? game.H / 2 : 0;

				if(game.stage.scale.x !== 1 || game.stage.x !== defaultCameraX || game.stage.y !== defaultCameraY) {
					resetZoomBtn = R.btn('x', game.editor.ui.viewport.resetZoom, 'Reset zoom and viewport position (Ctrl + double-click on viewport)', 'reset-zoom-btn');
				}
			}
			return R.span(null, resetZoomBtn, R.span(game.editor.isCurrentContainerModified ? null : transparentProps, '●'), txt);
		}
		return R.span();
	}
}