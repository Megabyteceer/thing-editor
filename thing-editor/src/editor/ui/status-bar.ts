import { Component } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import game from "thing-editor/src/engine/game";

export default class StatusBar extends Component {

	refreshStatus!: (ev: PointerEvent) => void;

	componentDidMount(): void {
		this.refreshStatus = () => {
			this.forceUpdate();
		};
		window.addEventListener('mousedown', this.refreshStatus as any);
		window.addEventListener('mousemove', this.refreshStatus as any);
		window.addEventListener('wheel', this.refreshStatus as any);
	}

	componentWillUnmount() {
		window.removeEventListener('mousedown', this.refreshStatus as any);
		window.removeEventListener('mousemove', this.refreshStatus as any);
		window.removeEventListener('wheel', this.refreshStatus as any);
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
				if(game.stage.scale.x !== 1 || game.stage.x !== 0 || game.stage.y !== 0) {
					resetZoomBtn = R.btn('x', game.editor.ui.viewport.resetZoom, 'Reset zoom and viewport position (Ctrl + double-click on viewport)', 'reset-zoom-btn');
				}
			}
			game.editor.ui.viewport.refreshCameraFrame();
			return R.span(null, resetZoomBtn, txt);
		}
		return R.span();
	}
}