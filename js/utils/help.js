const doNotDisturbHelpIdProps = {'data-do_not_disturb_helpid' : true};
const HELP_ROOT = 'https://github.com/Megabyteceer/thing-editor/wiki/';

let latestClickedHelpURL = HELP_ROOT;

window.addEventListener('mousedown', (ev) => {
	let t = ev.target;
	while(t) {
		if(t.dataset) {
			if(t.dataset.do_not_disturb_helpid) {
				return;
			}
			if(t.dataset.help) {
				latestClickedHelpURL = t.dataset.help;
				if(!latestClickedHelpURL.startsWith('http')) {
					latestClickedHelpURL = HELP_ROOT + latestClickedHelpURL;
				}
				return;
			}
		}
		t = t.parentNode;
	}
	latestClickedHelpURL = HELP_ROOT;
}, true);

export default class Help extends React.Component {
	render() {
		return R.span(doNotDisturbHelpIdProps, R.btn('Help', () => {
			editor.openUrl(latestClickedHelpURL);
		},
		'Click any element and then press (F1) to see its description.',
		undefined,
		112
		));
	}
}