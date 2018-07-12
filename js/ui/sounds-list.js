import Lib from "/thing-engine/js/lib.js";
import Group from "./group.js";
import Sound from "/thing-engine/js/utils/sound.js";

let sounds = {};

const bodyProps = {className: 'sounds-list list-view'};

let labelProps = {className: 'selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};

const soundNameCleaner = /^snd\//gm;
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
				editor.fs.getJSON('/fs/build-sounds?formats=' + (editor.projectDesc.soundFormats.join(','))).then((result) => {
					if(result.errors) {
						editor.ui.modal.showError(result.errors.map((r, i) =>{
							return R.div({key:i}, r);
						}));
					} else {
						editor.fs.openFile('snd/snd-convert-cache.json').then((soundsCache) => {

							const soundFilter =  new RegExp("^snd\/.*\.(" + editor.projectDesc.soundFormats.join('|') + ")$", "gmi");

							let soundsInProgress = 0;

							let sndCanheModified;
							const finish = () => {
								if(sndCanheModified) {
									editor.fs.saveFile('snd/snd-convert-cache.json', soundsCache, true);
								}
								Lib._setSounds(sounds);
								resolve();
							};

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
									let sndData = {src: fileName};

									let cache = soundsCache[name + '.wav'];
									assert(cache, "snd/snd-convert-cache.json has no info for " + fileName);
									if(!cache.hasOwnProperty(fileName)) {
										cache[fileName] = {};
									}
									cache = cache[fileName];

									if(cache.hasOwnProperty('start') && cache.hasOwnProperty('duration') && cache.duration > 0) {
										sndData.s = cache.start;
										sndData.d = cache.duration;
									} else {
										sndCanheModified = true;
										soundsInProgress++;
										getSoundParameters(Lib.__sndFileNameToPath(fileName), (res) => {
											cache.start = res.start;
											cache.duration = res.duration;
											sndData.s = res.start;
											sndData.d = res.duration;
											soundsInProgress--;
											if(soundsInProgress === 0) {
												finish();
											}
										});
									}
									sounds[name].push(sndData);
								}
							});

							for(let f in sounds) {
								let a = sounds[f];
								a.sort(soundsPriority);
							}
							if(soundsInProgress === 0) {
								finish();
							}
							
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
	let i = editor.projectDesc.soundFormats.indexOf(s.src.split('.').pop().toLowerCase());
	if(i < 0) {
		i = 1000;
	}
	return i;
};

let audioCtx;
function getSoundParameters(src, cb) {
	let ret = {};
	ret.duration = 0;
	ret.start = 0;

	if(!audioCtx) {
		audioCtx = new AudioContext();
	}
	var request = new XMLHttpRequest();
	request.open('GET', src, true);
	request.responseType = 'arraybuffer';
	request.onload = function() {
		var audioData = request.response;
		audioCtx.decodeAudioData(audioData).then(function(buffer) {

			let len = buffer.length;
			let startPos = len;
			let endPos = 0;
			
			for(let c = 0; c < buffer.numberOfChannels; c++) {
				let data = buffer.getChannelData(c);
				for(let i = 0; i < len; i++) {
					if(data[i] !== 0) {
						if(startPos > i) {
							startPos = i;
						}
						break;
					}
				}
				for(let i = len - 1; i >= 0; i--) {
					if(data[i] !== 0) {
						if(endPos < i) {
							endPos = i;
						}
						break;
					}
				}
			}

			const ratePerMs = buffer.sampleRate / 1000;
			ret.start = startPos / ratePerMs;
			ret.duration = endPos / ratePerMs - ret.start;

			cb(ret);
		}).catch(function(e){
			console.log("Error with decoding audio data" + e.err);
		});
	};
	request.send();
}