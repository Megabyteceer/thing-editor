import { Container } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics.js';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import group from 'thing-editor/src/editor/ui/group';
import Help from 'thing-editor/src/editor/ui/help';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';
import waitForCondition from 'thing-editor/src/editor/utils/wait-for-condition';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import fs from '../fs';
import { preactComponentChildToString } from './modal';

const errorIcon = R.icon('error-icon');
const warnIcon = R.icon('warn-icon');

type StatusItemsOwnersMap = WeakMap<NodeExtendData, Container | KeyedMap<true>>
type StatusListItemOwner = Container | ((ev?: PointerEvent) => void) | SourceMappedConstructor;
interface StatusListItem {
	message: string | ComponentChild;
	owner?: StatusListItemOwner;
	ownerId?: number;
	fieldName?: string;
	fieldArrayItemNumber: number;
	errorCode?: number;
	val?: any;
}

let lastClickedItem: StatusListItem | undefined;
let lastClickedList: InfoList | undefined;

const needAddInToList = (map: StatusItemsOwnersMap, owner?: StatusListItemOwner, fieldName?: string, errorCode?: number) => {
	waitForCondition(() => {
		return game.projectDesc;
	});
	if (game.projectDesc && game.projectDesc.__suspendWarnings && (game.projectDesc.__suspendWarnings.indexOf(errorCode!) >= 0)) {
		return;
	}
	if (!(owner instanceof Container)) {
		return true;
	} else {
		let exData = owner.__nodeExtendData;

		exData.statusWarnOwnerId = owner.___id;

		if (!fieldName) {
			fieldName = '_no_field_name_';
		}
		if (!map.has(exData)) {
			let o: KeyedMap<true> = {};
			o[fieldName] = true;
			map.set(exData, o);
			return true;
		} else {
			let o = map.get(exData) as KeyedMap<true>;
			let ret = !o[fieldName];
			o[fieldName] = true;
			return ret;
		}
	}
};


interface StatusState {
	toggled?: boolean;
}

export default class Status extends ComponentDebounced<ClassAttributes<Status>, StatusState> {

	private errorsMap: StatusItemsOwnersMap;
	private warnsMap: StatusItemsOwnersMap;
	private errors: StatusListItem[];
	private warns: StatusListItem[];

	private errorsList!: InfoList;
	private warnsList!: InfoList;


	constructor(props: ClassAttributes<Status>) {
		super(props);
		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();

		this.state = {};
		this.errors = [];
		this.warns = [];


		this.warnsListRef = this.warnsListRef.bind(this);
		this.errorsListRef = this.errorsListRef.bind(this);
		this.clear = this.clear.bind(this);
	}

	private errorsListRef(ref: InfoList | null) {
		this.errorsList = ref as InfoList;
	}

	private warnsListRef(ref: InfoList | null) {
		this.warnsList = ref as InfoList;
	}

	error(message: string, errorCode?: number, owner?: StatusListItemOwner, fieldName?: string, fieldArrayItemNumber = -1) {
		if (EDITOR_FLAGS.isTryTime) {
			return Promise.resolve();
		}

		if (game.editor.buildProjectAndExit) {
			message = preactComponentChildToString(message);
			fs.exitWithResult(undefined, 'Build failed: ' + game.editor.buildProjectAndExit + '\n' + message +
			'; Error code: ' + errorCode + (owner instanceof Container ?
				'; owner: ' + owner.___info : '') +
				(fieldName ? '; Field name: ' + fieldName : '')
			);
			return Promise.resolve();
		}

		assert((!errorCode) || (typeof errorCode === 'number'), 'Error code expected.');
		console.error(errorCode + ': ' + message + getErrorDetailsUrl(errorCode));
		let item: StatusListItem = { owner, ownerId: owner && (owner as Container).___id, message, fieldName, errorCode, fieldArrayItemNumber };
		if (owner && fieldName) {
			item.val = (owner as KeyedObject)[fieldName];
		}

		if (needAddInToList(this.errorsMap, owner, fieldName, errorCode)) {
			this.errors.push(item);
			if (this.errorsList) {
				this.errorsList.refresh();
			} else {
				this.show();
			}
			game.editor.pauseGame();
		}
		shakeDomElement(document.querySelector('#window-info') as HTMLElement);
	}

	warn(message: ComponentChild, errorCode?: number, owner?: StatusListItemOwner, fieldName?: string, doNoFilterRepeats = false, fieldArrayItemNumber = -1) {
		if (EDITOR_FLAGS.isTryTime) {
			return Promise.resolve();
		}
		assert((!errorCode) || (typeof errorCode === 'number'), 'Error code expected.');
		console.warn(message + getErrorDetailsUrl(errorCode));
		if (doNoFilterRepeats || needAddInToList(this.warnsMap, owner, fieldName, errorCode)) {
			let item: StatusListItem = { owner, ownerId: owner && (owner as Container).___id, message, fieldName, errorCode, fieldArrayItemNumber };
			if (owner && fieldName) {
				item.val = (owner as KeyedObject)[fieldName];
			}

			this.warns.push(item);
			if (this.errorsList) {
				this.warnsList.forceUpdate();
			} else {
				this.show();
			}
		}
	}

	clearLastClickedItem() {
		assert(lastClickedItem, 'lastClickedItem already cleared.');
		lastClickedList!.clearItem(lastClickedItem!);
		lastClickedItem = undefined;
	}

	clear() {
		this.errors.length = 0;
		this.warns.length = 0;

		this.errorsMap = new WeakMap();
		this.warnsMap = new WeakMap();

		this.hide();
	}

	private show() {
		this.setState({ toggled: true });
	}

	private hide() {
		this.setState({ toggled: false });
	}

	render() {
		if (this.state.toggled && ((this.errors.length > 0) || (this.warns.length > 0))) {
			showAdditionalWindow('window-info', 'Notifications', 'Notifications', R.fragment(
				R.btn('×', this.clear, 'Hide all', 'close-window-btn'),
				R.div({ className: 'status-body' },
					h(InfoList, { ref: this.errorsListRef, id: 'errors-list', title: 'Errors:', icon: errorIcon, className: 'info-errors-list info-list', list: this.errors, itemsMap: this.errorsMap }),
					h(InfoList, { ref: this.warnsListRef, id: 'warns-list', title: 'Warnings:', icon: warnIcon, className: 'info-warns-list info-list', list: this.warns, itemsMap: this.warnsMap })
				)
			), 40, 70, 100, 100, 400, 100);
		} else {
			hideAdditionalWindow('window-info');
		}
		return R.span();
	}
}

function getErrorDetailsUrl(errorCode?: number) {
	if (errorCode && (errorCode < 90000)) {
		return ' DETAILS: ' + Help.getUrlForError(errorCode);
	}
	return '';
}


const selectableSceneNodeProps = { className: 'selectable-scene-node' };

interface InfoListProps extends ClassAttributes<InfoList> {
	list: StatusListItem[];
	itemsMap: StatusItemsOwnersMap;
	id: string;
	title: string;
	icon: ComponentChild;
	className: string;
}

class InfoList extends ComponentDebounced<InfoListProps> {

	constructor(props: InfoListProps) {
		super(props);
		this.renderItem = this.renderItem.bind(this);
	}

	clearItem(item: StatusListItem) {
		let i = this.props.list.indexOf(item);
		assert(i >= 0, 'info list is corrupted');
		this.props.list.splice(i, 1);
		if (item.owner instanceof Container) {
			let exData = item.owner.__nodeExtendData;
			this.props.itemsMap.delete(exData);
		}
		game.editor.ui.status.refresh();
	}

	renderItem(item: StatusListItem, i: number) {

		let node;
		if (item.owner && item.owner instanceof Container) {
			node = R.div(selectableSceneNodeProps, R.sceneNode(item.owner));
		}
		return R.div({
			key: i, className: 'info-item clickable', title: 'Click line to go problem.', onClick: async (ev: PointerEvent) => {
				lastClickedItem = item;
				lastClickedList = this;

				if (typeof item.owner === 'function') {
					(item.owner as (ev: PointerEvent) => void)(ev);
				} else if (item.owner && (item.owner instanceof Container)) {
					let extendData = item.owner.__nodeExtendData;
					if ((item.owner.___id !== item.ownerId) || (extendData.statusWarnOwnerId !== item.ownerId)) {
						let newOwnerFinded = false;

						game.forAllChildrenEverywhere((o) => {
							if (o.constructor === (item.owner as Container).constructor && o.___id === item.ownerId) {
								if (!newOwnerFinded) {
									item.owner = o;
									newOwnerFinded = true;
								}
							}
						});

						if (!newOwnerFinded) {
							game.editor.ui.modal.showInfo('Object already removed form stage, or problem was solved.', undefined, 32042);
							return;
						}
					}
					game.editor.ui.sceneTree.selectInTree(item.owner, false, item.fieldName, item.fieldArrayItemNumber);
					shakeDomElement(document.querySelector('#sceneTree .item-selected') as HTMLElement);
				}
			}
		}, this.props.icon, item.message, node, R.btn('?', () => {
			Help.openErrorCodeHelp(item.errorCode);
		}, 'Open description for this notification (F1)', 'error-status-help-button', { key: 'F1' }), R.btn('×', () => {
			this.clearItem(item);
		}, 'Hide notification', 'clear-item-btn danger-btn')
		);
	}

	render() {
		if (this.props.list.length <= 0) {
			return R.div();
		}
		return R.div(null,
			R.div({ className: 'info-badge' }, this.props.list.length),
			group.renderGroup({ key: this.props.id, content: this.props.list.map(this.renderItem), title: this.props.title })
		);
	}
}
