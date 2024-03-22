import { EventEmitter } from 'events';
import type { Container } from 'pixi.js';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type TypedEventEmitter from 'typed-emitter';

type EditorEvents = {
	projectDidOpen: () => void;
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	afterPropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
	gameWillBeInitialized: () => void;
	firstSceneWillOpen: () => void;
	assetsRefreshed: () => void;
	soundPlay: (soundId: string, volume: number) => void;
};

const editorEvents = new EventEmitter() as TypedEventEmitter<EditorEvents>;

export { editorEvents };

