import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const doNotDisturbHelpIdProps = { 'data-do_not_disturb_helpID': true };
const HELP_ROOT = 'https://github.com/Megabyteceer/thing-editor/wiki/';

let latestClickedHelpURL = HELP_ROOT;

window.addEventListener('mousedown', (ev) => {
	if (ev.buttons === 4) {
		sp(ev);
	}
	let t = ev.target as HTMLElement;
	while (t) {
		if (t.dataset) {
			if (t.dataset.do_not_disturb_helpID) {
				return;
			}
			if (t.dataset.help) {
				Help.setCurrentHelp(t.dataset.help);
				return;
			}
		}
		t = t.parentNode as HTMLElement;
	}
	latestClickedHelpURL = HELP_ROOT + 'editor.Overview';
}, true);

export default class Help extends Component {

	static openErrorCodeHelp(errorCode?: number) {
		if (!errorCode) {
			errorCode = 90001;
		}
		game.editor.openUrl(Help.getUrlForError(errorCode));
	}

	static getUrlForError(errorCode: number): string {
		return HELP_ROOT + 'Error-Messages#' + errorCode;
	}

	static setCurrentHelp(url: string) {
		latestClickedHelpURL = url;
		if (!latestClickedHelpURL.startsWith('http')) {
			latestClickedHelpURL = HELP_ROOT + latestClickedHelpURL;
		}
	}

	render() {
		return R.span(doNotDisturbHelpIdProps, R.btn('Help (F1)', () => {
			game.editor.openUrl(latestClickedHelpURL);
		},
			'Click any element and then press (F1) to see its description.',
			'menu-btn',
			{ key: 'F1' }
		));
	}
}
