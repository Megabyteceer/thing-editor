import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';

const transparentProps = { className: 'transparent' };
const statusProps = { className: 'status-entry' };

const statusEntries: { text: string; id: string; priority: number }[] = [];

export default class StatusBar extends Component {

	interval!: number;

	componentDidMount(): void {
		this.interval = window.setInterval(() => {
			this.forceUpdate();
		}, 50);
	}

	static addStatus(text: string, id: string, priority = 0) {
		for (const e of statusEntries) {
			if (e.id === id) {
				e.text = text;
				return;
			}
		}
		statusEntries.push({ text, id, priority });
		statusEntries.sort((a, b) => { return b.priority - a.priority; });
	}

	static removeStatus(id: string) {
		const i = statusEntries.findIndex(e => e.id === id);
		if (i >= 0) {
			statusEntries.splice(i, 1);
		}
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}


	render() {

		if (game.editor.selection.length) {
			StatusBar.addStatus('Right click on viewport to move object to clicked point', 'right-click-to-move', -1);
		} else {
			StatusBar.removeStatus('right-click-to-move');
		}

		const status = statusEntries.length ?
			statusEntries.map((statusEntry) => {
				if (statusEntry.priority < 0 && statusEntries.some(e => e.priority >= 0)) {
					return undefined;
				}
				return R.span(statusProps, '(' + statusEntry.text + ')');
			}) : undefined;

		if (game && game.stage) {
			let txt = ' x: ' + game.__mouse_uncropped.x + ' y: ' + game.__mouse_uncropped.y;

			if (game.editor.selection.length > 0) {
				let p = game.editor.selection[0].toLocal(game.mouse);
				if (!isNaN(p.x)) {
					txt += ' (x: ' + Math.round(p.x - game.editor.selection[0].pivot.x) + '; y: ' + Math.round(p.y - game.editor.selection[0].pivot.y) + ')';
				}
			}

			let resetZoomBtn;
			if (game.stage) {
				if (game.stage.scale.x !== 1) {
					txt += ' zoom: ' + game.stage.scale.x;
				}

				const defaultCameraX = PrefabEditor.currentPrefabName ? game.W / 2 : 0;
				const defaultCameraY = PrefabEditor.currentPrefabName ? game.H / 2 : 0;

				if (game.stage.scale.x !== 1 || game.stage.x !== defaultCameraX || game.stage.y !== defaultCameraY) {
					resetZoomBtn = R.btn('x', game.editor.ui.viewport.resetZoom, 'Reset zoom and viewport position (Ctrl + double-click on viewport)', 'reset-zoom-btn');
				}
			}
			return R.span(null, resetZoomBtn, R.span(game.editor.isCurrentContainerModified ? null : transparentProps, '●'), txt, status);
		}
		return R.span();
	}
}
