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
	static openIndexedDB(): IDBOpenDBRequest {
		//@ts-ignore 
		let indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB as IDBFactory;
		const openDB = indexedDB.open("DB" + game.projectDesc.id, 1);

		openDB.onupgradeneeded = function () {
			openDB.result.createObjectStore("MyObjectStore", { keyPath: "id" });
		};

		return openDB;
	}

	static getStoreIndexedDB(openDB: IDBOpenDBRequest) {
		const result = openDB.result;
		const tx = result.transaction("MyObjectStore", "readwrite");
		const store = tx.objectStore("MyObjectStore");
		return { result, tx, store };
	}

	static save(name: string, type: string, data?: IndexedDBRecord | KeyedObject) {
		let openDB = this.openIndexedDB();
		const id = name + '::' + type;
		dataStore[id] = data;
		openDB.onsuccess = () => {
			let db = this.getStoreIndexedDB(openDB);
			db.store.put({ id, data });
		};
		return true;
	}

	static load(name: string, type: string): Promise<IndexedDBRecord | KeyedObject> {

		return new Promise((resolve) => {

			const id = name + '::' + type;

			if(dataStore.hasOwnProperty(id)) {
				setTimeout(() => {
					resolve(dataStore[id]!);
				}, 0);
			} else {
				const openDB = this.openIndexedDB();

				openDB.onsuccess = () => {

					const db = this.getStoreIndexedDB(openDB);
					const getData = db.store.get(id);
					getData.onsuccess = function () {
						const data = getData.result?.data;
						dataStore[id] = data;
						resolve!(getData.result && getData.result.data);
					};
					db.tx.oncomplete = function () {
						db.result.close();
					};

				};
			}
		});
	}

	static async openFile(key: string, type = 'sound', accept = "audio/x-wav"): Promise<IndexedDBRecord> {
		return new Promise((resolve) => {
			const readFile = (ev: InputEvent) => {
				const file = (ev.target as HTMLInputElement).files![0];
				if(!file) {
					return;
				}
				const reader = new FileReader();
				reader.onload = function (e) {
					const contents = e.target!.result as string;

					const data: IndexedDBRecord = {
						fileName: (ev.target as HTMLInputElement).value,
						data: contents
					}

					resolve(data);
					IndexedDBUtils.save(
						key,
						type,
						data
					);
				}
				reader.readAsDataURL(file)
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
}

export type { IndexedDBRecord };

let dataStore: KeyedMap<IndexedDBRecord | KeyedObject | undefined> = {};

