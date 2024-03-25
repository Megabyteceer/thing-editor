import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

const IS_SKIN_MODIFIED = '__is-skin-modified';

function message(msg: string) {
	if (game.classes.FlyText) {
		game.classes.FlyText.flyText(msg, game.mouse.x, game.mouse.y);
	} else {
		alert(msg);
	}
}
interface IndexedDBRecord {

	// visible file name which was selected to override sound
	fileName: string;
	// url encodes sound data.
	data: string;
}

interface PackageData {
	data: KeyedObject;
	settings: KeyedObject;
	type: 'indexed-db-utils-dump';
}

let fileInput: HTMLInputElement;
let func: () => void;
function clickElem(elem: HTMLInputElement) {
	const eventMouse = document.createEvent('MouseEvents');
	eventMouse.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	elem.dispatchEvent(eventMouse);
}

export default class IndexedDBUtils {

	static save(name: string, type: string, data?: IndexedDBRecord | KeyedObject) {
		const id = name + '::' + type;
		if (JSON.stringify(dataStore[id]) !== JSON.stringify(data)) {
			if (typeof data === 'undefined') {
				delete dataStore[id];
				getTransaction().then(db => db.delete(id));
			} else {
				dataStore[id] = data;
				getTransaction().then(db => db.put({ id, data }));
			}
			game.settings.setItem(IS_SKIN_MODIFIED, true);
		}
	}

	static load(name: string, type: string): IndexedDBRecord | KeyedObject | undefined {
		const id = name + '::' + type;
		return dataStore[id];
	}

	private static clear() {
		Object.keys(game.settings.data).forEach((key) => {
			if (key.startsWith('IDB_')) {
				game.settings.removeItem(key);
			}
		});

		this.resetIsSkinModified();

		return new Promise<void>((resolve) => {
			getTransaction().then((db) => {
				db.clear().onsuccess = () => {
					resolve();
				};
			});
		});
	}

	static export() {

		const a = document.createElement('a');
		const content = this.getRawData();
		if (content) {
			const file = new Blob([content], { type: 'text/plain' });
			a.href = URL.createObjectURL(file) + '#_Export_skin';
			a.download = game.settings.getItem('IDB_skin-name', 'New-skin.json');
			a.click();
			this.resetIsSkinModified();
		}
	}

	static getRawData() {
		if (!Object.keys(dataStore).length) {
			message('no data to export');
			return;
		}
		const settings = {} as KeyedObject;
		Object.keys(game.settings.data).forEach((key) => {
			if (key.startsWith('IDB_')) {
				settings[key] = game.settings.getItem(key);
			}
		});
		return JSON.stringify({
			data: dataStore,
			settings,
			type: 'indexed-db-utils-dump'
		} as PackageData);
	}

	static async import() {
		await this.askAboutUnsavedChanges('Load Anyway');

		const data = await chooseFile('application/json');
		this.importRawData(data.data, data.fileName);

	}

	static async importRawData(data: string, fileName?: string) {
		try {
			if (Lib.hasPrefab('final-fader')) {
				game.showModal('final-fader');
			}
			const content = JSON.parse(data) as PackageData;
			if (content.type !== 'indexed-db-utils-dump') {
				message('Wrong file format.');
				return;
			}
			if (fileName) {
				content.settings['IDB_skin-name'] = fileName;
			}
			await this.setFullData(content);
		} catch (er: any) {
			game.hideModal();
			message('import error: ' + er.message);
		}
	}

	private static async setFullData(data: PackageData) {
		await this.clear();
		dataStore = data.data;
		await Promise.all(Object.keys(dataStore).map((id) => {
			return new Promise<void>((resolve) => {
				getTransaction().then(db => db.put({ id, data: dataStore[id] }).onsuccess = () => {
					resolve();
				});
			});
		}));
		for (const key in data.settings) {
			game.settings.setItem(key, data.settings[key]);
		}
		window.location.reload();
	}

	private static async askAboutUnsavedChanges(okMessage: string) {
		return new Promise<void>((resolve) => {
			if (this.isSkinModified()) {
				game.showQuestion('Are you sure?', 'Current skin has unsaved changes.', okMessage, resolve);
			} else {
				resolve();
			}
		});
	}

	static isSkinModified() {
		return game.settings.getItem(IS_SKIN_MODIFIED);
	}

	static resetIsSkinModified() {
		return game.settings.removeItem(IS_SKIN_MODIFIED);
	}

	static async reset() {
		await this.askAboutUnsavedChanges('Reset skin anyway');
		game.settings.removeItem('IDB_skin-name');
		await this.setFullData({ settings: {}, data: {}, type: 'indexed-db-utils-dump' });
	}

	static async openFile(key: string, type = 'sound', accept = 'audio/x-wav'): Promise<IndexedDBRecord> {

		const contents = await chooseFile(accept);

		if (contents) {
			IndexedDBUtils.save(
				key,
				type,
				contents
			);
		}
		return contents;
	}
}

async function chooseFile(accept = 'audio/x-wav'): Promise<IndexedDBRecord> {
	return new Promise((resolve) => {
		const readFile = (ev: InputEvent) => {
			const file = (ev.target as HTMLInputElement).files![0];
			if (!file) {
				return;
			}
			const reader = new FileReader();
			reader.onload = function (e) {
				const contents = e.target!.result as string;
				resolve({
					fileName: (ev.target as HTMLInputElement).value.split(/[\\\/]/).pop()!,
					data: contents
				});

			};
			if (file.name.endsWith('.json')) {
				reader.readAsText(file);
			} else {
				reader.readAsDataURL(file);
			}
		};
		if (!fileInput) {
			fileInput = document.createElement('input');
			fileInput.type = 'file';
			document.body.appendChild(fileInput);
			fileInput.style.display = 'none';
		}
		fileInput.value = '';
		fileInput.removeEventListener('change', func);
		func = readFile as any;
		fileInput.addEventListener('change', func);
		fileInput.accept = accept;
		clickElem(fileInput);
	});
}

export { chooseFile };
export type { IndexedDBRecord };

let dataStore: KeyedMap<IndexedDBRecord | KeyedObject | undefined> = {};

let db: IDBDatabase;

function getTransaction(): Promise<IDBObjectStore> {
	return new Promise((resolve) => {
		const transaction = db.transaction('MyObjectStore', 'readwrite');
		resolve(transaction.objectStore('MyObjectStore'));

		/*transaction.oncomplete = function () {
			db.close();
		};*/
	});
}


window.addEventListener('game-will-init', () => {
	game.loadingAdd('indexed-db');
	//@ts-ignore
	let indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB as IDBFactory;
	const openDB = indexedDB.open('DB' + game.projectDesc.id, 1);

	openDB.onupgradeneeded = function () {
		openDB.result.createObjectStore('MyObjectStore', { keyPath: 'id' });
	};

	openDB.onsuccess = () => {
		db = openDB.result;
		getTransaction().then(transaction => {
			const req = transaction.getAllKeys();
			req.onsuccess = () => {
				for (const key of req.result) {
					const getData = transaction.get(key);
					game.loadingAdd(key);
					getData.onsuccess = function () {
						const data = getData.result?.data;
						dataStore[key.toString()] = data;
						game.loadingRemove(key);
					};
				}
				game.loadingRemove('indexed-db');
			};
		});
	};
});
