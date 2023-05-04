
import {
	Component
} from "preact";

import EventEmitter from "events";
import TypedEmitter from "typed-emitter"

import R from "./preact-fabrics";

import game from "../engine/game";

import ClassesLoader from "./classes-loader";
import { KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs from "thing-editor/src/editor/fs";
import DisplayObject, { DisplayObjectType } from "thing-editor/src/engine/display-object";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import Selection from "thing-editor/src/editor/utils/selection";
import historyInstance from "thing-editor/src/editor/utils/history";
import AssetsLoader from "thing-editor/src/editor/assets-loader";

type EditorEvents = {
	beforePropertyChanged: (o: DisplayObjectType, fieldName: string, field: EditablePropertyDesc, val: any, isDelta: boolean) => void,
	afterPropertyChanged: (body: string, from: string) => void
}

interface EditorProps {
	recId: number;
}
interface EditorState {
	message: string;
}

export default class Editor extends Component<EditorProps, EditorState> {

	currentGame = '/games/game1/'
	editorArguments: KeyedMap<true> = {};

	selection = new Selection();

	disableFieldsCache: boolean = false;

	//@ts-ignore
	events = new EventEmitter() as TypedEmitter<EditorEvents>;

	history = historyInstance;

	_lastChangedFiledName: string | null = null;

	constructor() {
		super();

		for(let arg of thingEditorServer.argv) {
			this.editorArguments[arg] = true;
		}
	}

	componentDidMount() {
		game.editor = this;
		game.init();

		// load built in components
		fs.refreshAssetsList(['./thing-editor/src/engine/components']);
		ClassesLoader.reloadClasses(true).then(() => {

		});
	}

	async reloadAssetsAndClasses() {
		await ClassesLoader.reloadClasses();
		await AssetsLoader.reloadAssets();
	}

	showError(message: string, _errorCode = 99999) {
		alert(message); //TODO:
	}

	logError(message: string, _errorCode = 99999, _owner?: DisplayObjectType | (() => any), _fieldName?: string) {
		alert(message); //TODO:
	}

	warn(message: string, _errorCode = 99999, _owner?: DisplayObjectType | (() => any), _fieldName?: string) {
		alert(message); //TODO:
	}

	notify(message: string | preact.Component) {
		alert(message); //TODO:
	}

	selectField(_fieldName: string) {
		//TODO:
	}

	refreshTreeViewAndPropertyEditor() {
		//TODO:
	}

	getFieldNameByValue(node: SourceMappedConstructor, fieldValue: any) {
		if(node instanceof DisplayObject) {
			for(let p of node.__editableProps) {
				//@ts-ignore
				if(node[p.name] === fieldValue) {
					return p.name;
				}
			}
		}
	}

	copyToClipboard(text: string) {
		navigator.permissions.query({
			//@ts-ignore
			name: 'clipboard-read'
		}).then(() => {
			navigator.clipboard.writeText(text).then(() => {
				this.notify(R.span(null, R.icon('copy'), '"' + text + '"'));
			});
		});
	}

	editClassSource(c: SourceMappedConstructor | DisplayObjectType) {
		if(this.editorArguments['no-vscode-integration']) {
			return;
		}
		if(c instanceof DisplayObject) {
			c = c.constructor as SourceMappedConstructor;
		}
		let filePath = c.__sourceFileName as string;
		fs.editFile(filePath);
	}

	render(_props: EditorProps, state: EditorState) {
		return R.span(null, state.message,
			R.button({
				className: 'clickable',
				onClick: () => {
					ClassesLoader.reloadClasses();
				}
			},
				'ok')
		)
	}
}
