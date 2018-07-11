import Lib from "/thing-engine/js/lib.js";
import Group from "./group.js";
import Sound from "/thing-engine/js/utils/sound.js";

let soundsList = [];
let sounds = {};

const bodyProps = {className: 'sounds-list list-view'};

let labelProps = {className: 'selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};

const supportedSoundFormats = ['webm', 'ogg', 'mp3', 'weba'];

export default class SoundsList extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
	}

	reloadSounds() {
		return new Promise((resolve) => {
			if(editor.projectDesc.soundFormats) {
				for(let f of editor.projectDesc.soundFormats) {
					if(supportedSoundFormats.indexOf(f) < 0) {
						editor.ui.modal.showError('soundFormats has unsupported format entry: ' + f);
						editor.openProjectDescToEdit();
						return;
					}
				}
				editor.fs.getJSON('/fs/build-sounds?nocache=1&formats=' + (editor.projectDesc.soundFormats.join(','))).then((result) => {
					if(result.errors) {
						editor.ui.modal.showError(result.errors.map((r, i) =>{
							return R.div({key:i}, r);
						}));
					} else {
						editor.fs.getJSON('snd/sounds.json').then((soundsData) => {
							sounds = soundsData;
							soundsList = [];
							for(let name in sounds) {
								soundsList.push({name, value: name});
							}
							Lib._setSounds(sounds);
							resolve();
						});
					}
				});
			}
		});
	}
	onSelect(item) {
		let needPlay = !Lib.getSound(item.name).playing();
		Sound.stop();
		if(needPlay) {
			Sound.play(item.name);
		}
	}

	onStopAllClick() {
		Sound.stop();
	}

	renderItem(sndName, item) {
		return R.listItem(R.span(null, R.icon('sound'), R.b(labelProps, sndName)), item, sndName, this);
	}
	
	render() {
		let list = [];
		this.state.selectedItem = null;
		for (let sndName of soundsList) {
			list.push(this.renderItem(sndName.name, sndName));
		}

		list = Group.groupArray(list);
		
		return R.fragment(
			R.div(null,
				R.btn('Stop all', this.onStopAllClick)
			),
			R.div(bodyProps, list)
		);
	}

}
