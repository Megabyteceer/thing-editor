import Sound from "../../engine/utils/sound.js";
import PrefabsList from "../ui/prefabs-list.js";
import AssetsLoader from "./assets-loader.js";
import fs from "./fs.js";

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	// connected to server socket
};

function addAssetNameInToMap(name, map) {
	if(!map) {
		map = new Map();
	}
	map.set(name.substr(4), true);
	return map;
}

ws.onmessage = function incoming(data) {
	data = JSON.parse(data.data);
	if(data.hasOwnProperty('clientsConnected')) {

		if(data.clientsConnected !== 1) {
			editor.ui.modal.showFatalError('Thing-editor already launched.', 20004);
			ws.onclose = undefined;
		} else {
			editor.onServerAllowsWorking();
		}
	} else if(data.hasOwnProperty('call')) {
		editor.callByPath('this.' + data.call, window);
	} else if(data.hasOwnProperty('notifyText')) {
		editor.ui.modal.notify(data.notifyText);
	} else if(data.hasOwnProperty('sameFiles')) {
		for(let i of data.sameFiles) {
			editor.ui.status.warn("File overlaps the same file in library. " + i.assetName + ' => ' + i.overlaps, 99999, async (ev) => {
				let preview;
				if(i.assetName.startsWith('img/')) {
					preview = R.div(null, R.img({src: '/' + i.overlaps}));
				} else if(i.assetName.startsWith('snd/')) {
					Sound.play(i.assetName.substr(4).split('.').shift());
				}
				preview = R.div(null, i.assetName, preview);
				let answer = ev.ctrlKey || (await editor.ui.modal.showEditorQuestion('A you sure you want to remove duplicate file?', preview, async () => {
				}, R.span({className: 'danger'}, R.img({src: 'img/delete.png'}), "Delete duplicate file")));
				Sound.__stop();
				if(answer) {
					await fs.deleteFile(i.assetName);
					editor.reloadAssets();
				}
				return answer;
			});
		}
	} else if(data.hasOwnProperty('showSpinner')) {
		editor.ui.modal.showSpinner();
	} else if(data.hasOwnProperty('hideSpinner')) {
		editor.ui.modal.hideSpinner();
	} else if(data.hasOwnProperty('filesChanged') && editor.projectDesc && !editor.projectOpeningInProgress) {
		let imagesUpdated;
		let soundsUpdated;
		let imagesDeleted;
		let soundsDeleted;
		let srcChanged;
		let textUpdated;
		for(let file of data.filesChanged) {
			if(file.name.startsWith('img/')) {
				if(file.deleted) {
					imagesDeleted = addAssetNameInToMap(file.name, imagesDeleted);
				} else {
					imagesUpdated = addAssetNameInToMap(file.name, imagesUpdated);
				}
			} else if(file.name.startsWith('i18n/') && file.name.endsWith('.json')) {
				textUpdated = true;
			} else if(file.name.startsWith('snd/') && file.name.endsWith('.wav')) {
				if(file.deleted) {
					soundsDeleted = addAssetNameInToMap(file.name, soundsDeleted);
				} else {
					soundsUpdated = addAssetNameInToMap(file.name, soundsUpdated);
				}
			} else if(file.name.endsWith('.js')) {
				srcChanged = true;
			} else if(file.name.endsWith('.json') && (file.name.indexOf('/.') < 0) && !file.name.startsWith('snd/')) {
				if(file.name.startsWith('prefabs')) {
					if(PrefabsList.prefabChangedExternally()) {
						return;
					}
				}
				fs.fileChangedExternally(file.name);
				editor.ui.status.warn("File changed externally: " + file.name, 32045);
			}
		}

		if(imagesUpdated) {
			AssetsLoader.reloadAssets(true, imagesUpdated);
		}
		if(soundsUpdated && !editor.ui.soundsList.soundsReloadingInProgress) {
			editor.ui.soundsList.reloadSounds(soundsUpdated, true);
		}
		if(imagesDeleted) {
			AssetsLoader.deleteAssets(imagesDeleted.keys());
		}
		if(textUpdated) {
			editor.ui.LanguageView.onTextDataChanged();
		}
		if(soundsDeleted) {
			editor.ui.soundsList.afterDeleteSounds(soundsDeleted.keys());
		}
		if(srcChanged) {
			editor.ui.viewport.jsFilesChanged();
		}
	}

};

let exitInProgress = false;
ws.exitWithResult = function (success, error) {
	exitInProgress = true;
	ws.send(JSON.stringify({
		exitWithResult: {success, error}
	}));
	setTimeout(() => {
		window.close();
	}, 1000);
};

ws.log = function (txt) {
	ws.send(JSON.stringify({log: txt}));
};

ws.onclose = function incoming() {
	if(!exitInProgress) {
		closeWindow();
	}
};

function closeWindow() {
	editor.ui.modal.showFatalError("Page can be closed now.", 20005);
}

export default ws;