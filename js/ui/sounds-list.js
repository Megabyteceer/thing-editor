import Lib from "thing-engine/js/lib.js";
import Group from "./group.js";
import Sound from "thing-engine/js/utils/sound.js";
import BgMusic from "thing-engine/js/components/bg-music.js";
import game from "thing-engine/js/game.js";

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

	rebuildSounds(noCacheSoundName) {
		let options = {
			formats: editor.projectDesc.soundFormats,
			noCacheSoundName,
			bitrates: editor.projectDesc.soundBitrates,
			defaultBitrate: editor.projectDesc.soundDefaultBitrate
		};
		return editor.fs.postJSON('/fs/build-sounds', options);
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
				this.rebuildSounds().then((result) => {
					if(result.errors) {
						editor.ui.modal.showError(result.errors.map((r, i) =>{
							return R.div({key:i}, JSON.stringify(r));
						}), "Sounds processing ffmpeg lib error.");
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
		if(game.__EDITORmode) {
			Sound.stop();
		}
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
					editor.saveProjectDesc();
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
				R.btn('Stop all', this.onStopAllClick),
				React.createElement(MusicProfiler)
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


const profilerWrapperProps = {className: 'music-profiler-wrapper'};
const profilerProps = {className: 'music-profiler'};
const activeSoundProps = {style: {fontWeight: 'bold'}};

class MusicProfiler extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.onToggle = this.onToggle.bind(this);
	}

	componentDidMount() {
		this.interval = setInterval(() => {
			this.forceUpdate();
		}, 20);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	onToggle() {
		this.setState({toggled: !this.state.toggled});
	}

	renderMusicItem(m, i) {
		let state;
		let playing;
		if(m._currentFragment) {
			if(!m._currentFragment.playing()) {
				state = R.div({class:'danger'}, 'ref to notplaying fragement');
			} else {
				playing = true;
				state = R.div({className: 'sound-vol-bar', style: {width: m.getVolume() * 100}});
			}
		}
		return R.div({className:'clickable', key:i, onClick:() => {
			if(m.getRootContainer() === game.currentContainer) {
				editor.ui.sceneTree.selectInTree(m);
			} else {
				let root = m.getRootContainer();
				if(!root) {
					root = m;
					while(root.parent) {
						root = root.parent;
					}
				}
				editor.ui.modal.showQuestion(
					'Cant select music object',
					R.div(null, "Container of this music :", R.sceneNode(root))
				);
			}
		}},
		R.span((playing && !m.isLoopPos) ? activeSoundProps : null, m.intro),
		' : ',
		R.span((playing && m.isLoopPos) ? activeSoundProps : null, m.loop),
		state
		);
	}

	render() {
		let list;
		let className;
		if(this.state.toggled) {
			if(game.__EDITORmode) {
				list = 'Start game execution to profile music.';
			} else {
				list = BgMusic.__allActiveMusics.map(this.renderMusicItem);
			}
			list = R.div(profilerProps, list);
		} else {
			for(let m of BgMusic.__allActiveMusics) {
				if(m._currentFragment) {
					if(!m._currentFragment.volume() === 0) {
						className = 'danger';
					}
				}
			}
		}
		return R.span(profilerWrapperProps, 
			R.btn('profiler', this.onToggle, undefined, className),
			list
		);
	}

}