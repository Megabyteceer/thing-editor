import Lib from "/thing-engine/js/lib.js";
import Group from "./group.js";
import Sound from "/thing-engine/js/utils/sound.js";

let soundsList = [];
let sounds = {};
const extRemover = /\.[^\/\.]+$/;

const soundFilter = /^snd\/.*\.(mp3|webm|ogg|weba|wav)$/gmi;
const soundNameCleaner = /^snd\//gm;

const bodyProps = {className: 'sounds-list'};

let labelProps = {className: 'selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};

export default class SoundsList extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
	}

	reloadSounds() {
		soundsList = [];
		sounds = {};

		editor.fs.files.some((fileName) => {
			if(fileName.match(soundFilter)) {
				
				fileName = fileName.replace(soundNameCleaner, '');
				let name = fileName.replace(extRemover, '');
				
				if(!sounds.hasOwnProperty(name)) {
					soundsList.push({name, value: name});
					sounds[name] = [fileName];
				} else {
					sounds[name].push(fileName);
				}
			}
		});

		for(let f in sounds) {
			let a = sounds[f];
			a.sort(soundsPriority);
		}

		Lib._setSounds(sounds);

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

const soundsPriority = (a,b) => {
	return getSndPriority(b) - getSndPriority(a);
};

const getSndPriority = (s) => {
	return extsPriority[s.split('.').pop().toLowerCase()] || 0;
};

const extsPriority = {
	weba: 110,
	webm: 100,
	mp3: 80,
	ogg: 90,
	wav: 70
};