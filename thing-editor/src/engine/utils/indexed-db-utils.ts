import { KeyedObject } from 'thing-editor/src/editor/env';
import game from 'thing-editor/src/engine/game';

interface IndexedDBRecord {

	// visible file name which was selected to override sound
	fileName: string,
	// url encodes sound data.
	data: string;
}


let fileInput: HTMLInputElement;
let func: () => void;
function clickElem(elem: HTMLInputElement) {
	const eventMouse = document.createEvent("MouseEvents")
	eventMouse.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
	elem.dispatchEvent(eventMouse)
}

export default class IndexedDBUtils {

	static save(name: string, type: string, data?: IndexedDBRecord | KeyedObject) {
		const id = name + '::' + type;
		if(JSON.stringify(dataStore[id]) !== JSON.stringify(data)) {
			if(typeof data === 'undefined') {
				delete dataStore[id];
				getTransaction().then(db => db.delete(id));
			} else {
				dataStore[id] = data;
				getTransaction().then(db => db.put({ id, data }));
			}

		}
	}

	static load(name: string, type: string): IndexedDBRecord | KeyedObject | undefined {
		const id = name + '::' + type;
		return dataStore[id];
	}

	static clear() {
		getTransaction().then(db => db.clear());
	}

	static export() {
		if(!Object.keys(dataStore).length) {
			alert('no data to export');
			return;
		}
		const a = document.createElement("a");
		const content = JSON.stringify({
			data: dataStore,
			type: 'indexed-db-utils-dump'
		});
		const file = new Blob([content], { type: 'text/plain' });
		a.href = URL.createObjectURL(file) + "#_Export_skin";
		a.download = game.projectDesc.id + '.skin.json';
		a.click();
	}

	static async import() {
		const data = await chooseFile('application/json');
		try {
			game.showModal('final-fader');
			const content = JSON.parse(data.data);
			if(content.type !== 'indexed-db-utils-dump') {
				alert('Wrong file format.');
				return;
			}
			await this.clear();
			dataStore = content.data;
			for(const id in dataStore) {
				getTransaction().then(db => db.put({ id, data: dataStore[id] }));
			}
			getTransaction().then(() => {
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			});
		} catch(er: any) {
			game.hideModal();
			alert('import error: ' + er.message);
		}
	}

	static async openFile(key: string, type = 'sound', accept = "audio/x-wav"): Promise<IndexedDBRecord> {

		const contents = await chooseFile(accept);

		if(contents) {
			IndexedDBUtils.save(
				key,
				type,
				contents
			);

		}
		return contents;
	}
}

async function chooseFile(accept = "audio/x-wav"): Promise<IndexedDBRecord> {
	return new Promise((resolve) => {
		const readFile = (ev: InputEvent) => {
			const file = (ev.target as HTMLInputElement).files![0];
			if(!file) {
				return;
			}
			const reader = new FileReader();
			reader.onload = function (e) {
				const contents = e.target!.result as string;
				resolve({
					fileName: (ev.target as HTMLInputElement).value.split(/[\\\/]/).pop()!,
					data: contents
				});

			}
			if(file.name.endsWith('.json')) {
				reader.readAsText(file);
			} else {
				reader.readAsDataURL(file);
			}
		}
		if(!fileInput) {
			fileInput = document.createElement("input")
			fileInput.type = 'file'
			document.body.appendChild(fileInput)
			fileInput.style.display = 'none'
		}
		fileInput.removeEventListener('change', func);
		func = readFile as any;
		fileInput.addEventListener('change', func);
		fileInput.accept = accept;
		clickElem(fileInput)
	});
}

export type { IndexedDBRecord };

let dataStore: KeyedMap<IndexedDBRecord | KeyedObject | undefined> = {};

let db: IDBDatabase;

function getTransaction(): Promise<IDBObjectStore> {
	return new Promise((resolve) => {
		const transaction = db.transaction("MyObjectStore", "readwrite");
		resolve(transaction.objectStore("MyObjectStore"));

		/*transaction.oncomplete = function () {
			db.close();
		};*/
	});
}


window.addEventListener('game-will-init', () => {
	game.loadingAdd('indexed-db');
	//@ts-ignore 
	let indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB as IDBFactory;
	const openDB = indexedDB.open("DB" + game.projectDesc.id, 1);

	openDB.onupgradeneeded = function () {
		openDB.result.createObjectStore("MyObjectStore", { keyPath: "id" });
	};

	openDB.onsuccess = () => {
		db = openDB.result;
		getTransaction().then(transaction => {
			const req = transaction.getAllKeys();
			req.onsuccess = () => {
				for(const key of req.result) {
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
		})
	};
});