import Lib from "thing-engine/js/lib.js";
import Group from "./group.js";
import Sound from "thing-engine/js/utils/sound.js";

let sounds = {};

const bodyProps = {className: 'sounds-list list-view'};

let labelProps = {className: 'selectable-text', onMouseDown:window.copyTextByClick};

const soundNameCleaner = /^snd\//gm;
const supportedSoundFormats = ['webm', 'ogg', 'mp3', 'weba', 'aac'];

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
				editor.fs.getJSON('/fs/build-sounds?formats=' + (editor.projectDesc.soundFormats.join(','))).then((result) => {
					if(result.errors) {
						editor.ui.modal.showError(result.errors.map((r, i) =>{
							return R.div({key:i}, r);
						}));
					} else {

						const reloadSoundsInner = () => {
							const soundFilter =  new RegExp("^snd\/.*\.(" + editor.projectDesc.soundFormats.join('|') + ")$", "gmi");

							sounds = {};
							editor.fs.files.some((fileName) => {
								if(fileName.match(soundFilter)) {

									fileName = fileName.replace(soundNameCleaner, '');					
									let name = fileName.split('.');
									name.pop();
									name = name.join('.');
									if(!sounds.hasOwnProperty(name)) {
										sounds[name] = [];
									}
									sounds[name].push(fileName);
								}
							});

							for(let f in sounds) {
								let a = sounds[f];
								a.sort(soundsPriority);
							}

							Lib._setSounds(sounds);
							resolve();
						};

						if(result.updated) {
							editor.fs.refreshFiles().then(reloadSoundsInner);
						} else {
							reloadSoundsInner();
						}
					}
				});
			} else {
				assert(false, 'no soundFormats option defined', true);
				resolve();
			}
		});
	}
	onSelect(item) {
		Lib.preloadSound(item.name);
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
		return R.listItem(R.span(null, R.icon('sound'), R.b(labelProps, sndName), 
			R.span({className:'sound-preload-checkbox', title:'Preload sound.',
				onClick: (ev) => {
					ev.stopPropagation();	
					var opt = editor.projectDesc.loadOnDemandSounds;
					if(opt.hasOwnProperty(sndName)) {
						delete opt[sndName];
						Lib.preloadSound(sndName);
					} else {
						opt[sndName] = 1;
					}
					editor.saveProjecrDesc();
					this.forceUpdate();
				}},
			editor.projectDesc.loadOnDemandSounds.hasOwnProperty(sndName) ? '☐' : '☑'
			)
			
		), item, sndName, this);
	}
	
	render() {
		let list = [];
		this.state.selectedItem = null;
		for (let sndName of Lib.__soundsList) {
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

const soundsPriority = (a, b) => {
	return getSndPriority(a) - getSndPriority(b);
};

const getSndPriority = (s) => {
	let i = editor.projectDesc.soundFormats.indexOf(s.split('.').pop().toLowerCase());
	if(i < 0) {
		i = 1000;
	}
	return i;
};