
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

	}

	static load(name: string, type: string): IndexedDBRecord | KeyedObject | undefined {

	}

	private static clear() {

	}

	static export() {

	}

	static getRawData() {
		return '';
	}

	static async import() {


	}

	static async importRawData(data: string, fileName?: string) {

	}

	private static async setFullData(data: PackageData) {

	}

	private static async askAboutUnsavedChanges(okMessage: string) {

	}

	static isSkinModified() {
		return false;
	}

	static resetIsSkinModified() {

	}

	static async reset() {

	}

	static async openFile(key: string, type = 'sound', accept = 'audio/x-wav'): Promise<IndexedDBRecord> {

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

