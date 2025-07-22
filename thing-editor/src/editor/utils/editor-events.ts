import { EventEmitter } from 'events';
import type { Container } from 'pixi.js';
import type TypedEventEmitter from 'typed-emitter';
import EDITOR_FLAGS from './flags';

type EditorEvents = {
	playToggle: () => void;
	projectDidOpen: () => void;
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	afterPropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	willClassesReload: () => void;
	didClassesReloaded: () => void;
	gameWillBeInitialized: () => void;
	firstSceneWillOpen: () => void;
	assetsRefreshed: () => void;
	soundPlay: (soundId: string, volume: number) => void;
};

const editorEvents = new EventEmitter() as TypedEventEmitter<EditorEvents>;
editorEvents.setMaxListeners(1000);
const originalOn = editorEvents.on.bind(editorEvents) as any;

(editorEvents as any).on = function proxiedOn(...args:any) {
	if (EDITOR_FLAGS.__classesReloadingTime) {
		(args[1] as any).__userHandler_iIUH213 = true;
	}
	originalOn(...args);
};
(editorEvents as any).__removeUserHandlers = function() {
	for (const key in (editorEvents as any)._events) {
		const a = (editorEvents as any)._events[key] as any;
		if (Array.isArray(a)) {
			for (let i = a.length - 1; i >= 0; i--) {
				const f = a[i];
				if (f.__userHandler_iIUH213) {
					editorEvents.off(key as any, f);
				}
			}
		}
	}
	//
}.bind(editorEvents);

export { editorEvents };

