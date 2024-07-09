import { EventEmitter } from 'events';
import type { Container } from 'pixi.js';
import type TypedEventEmitter from 'typed-emitter';

type EditorEvents = {
	projectDidOpen: () => void;
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	afterPropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	willClassesReload: () => void;
	gameWillBeInitialized: () => void;
	firstSceneWillOpen: () => void;
	assetsRefreshed: () => void;
	soundPlay: (soundId: string, volume: number) => void;
};

/** Warning! Events handlers can be added more that once because of dynamic classes reloading.
 * Please ensure you adding handlers with checking if you not added it already.
 * As example you can store a flag some where in global object:
 *
`````````
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
/// #if EDITOR
// this code will be called after each classes reloading so you will add the same handler many times

if (!(EDITOR_FLAGS as any).__myClassesReloadingHandlerAdded) {
	editorEvents.on('willClassesReload', () => {
		console.log('fire once per classes reloading');
	});
	(EDITOR_FLAGS as any).__myClassesReloadingHandlerAdded = true;
}
editorEvents.on('willClassesReload', () => {
	console.log('fire as many times per each classes reloading, as many time you have reloaded them.');
});
/// #endif
`````````
 * */
const editorEvents = new EventEmitter() as TypedEventEmitter<EditorEvents>;

export { editorEvents };

