import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';
import type Spine from 'thing-editor/src/engine/lib/assets/src/extended/spine.c';
import type { SpineSequence } from 'thing-editor/src/engine/lib/assets/src/extended/spine.c';
import Window from '../../../editor-window';
import { hideAdditionalWindow, showAdditionalWindow } from '../../../ui';
import SpineSequences from './spine-sequences';

interface SpineSequencesEditorState {
	toggled: boolean;
}

function bringTimelineForward() {
	Window.bringWindowForward('#propsEditor');
	Window.bringWindowForward('#spine-sequence', true);
}

export default class SpineSequencesEditor extends Component<ClassAttributes<SpineSequencesEditor>, SpineSequencesEditorState> {

	constructor(props: ClassAttributes<SpineSequencesEditor>) {
		super(props);
		this.state = { toggled: game.editor.settings.getItem('timeline-showed', true) };
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	static search(textToSearch:string, sequences: SpineSequence[], property: EditablePropertyDesc, o:Container, addSearchEntry: (o: Container, propertyName: string) => void): boolean {
		let ret = false;
		let sequenceNum = 0;
		for (let sequence of sequences) {
			if (sequence.n.toLocaleLowerCase().includes(textToSearch)) {
				addSearchEntry(o, property.name + ',' + sequenceNum);
				ret = true;
			}
			let itemNum = 0;
			for (let item of sequence.s) {
				if (item.n && (item.n.toLowerCase().includes(textToSearch))) {
					addSearchEntry(o, property.name + ',' + sequenceNum + ',' + itemNum);
					ret = true;
				}
				if (item.actions) {
					let actionNum = 0;
					for (let action of item.actions) {
						if (action.a && (action.a.toLowerCase().includes(textToSearch))) {
							addSearchEntry(o, property.name + ',' + sequenceNum + ',' + itemNum + ',' + actionNum);
							ret = true;
						}
						actionNum++;
					}
				}
				itemNum++;
			}
			sequenceNum++;
		}
		return ret;
	}

	componentDidMount() {
		bringTimelineForward();
		this._renderWindow();
	}

	componentWillUnmount() {
		this._hideWindow();
	}

	render() {
		return R.btn(this.state.toggled ? 'Close Sequences' : 'Open Sequences', this.onToggleClick, undefined, undefined, { key: 'l', ctrlKey: true });
	}

	onToggleClick() { //show/hide timeline window
		let t = !this.state.toggled;
		this.setState({ toggled: t });
		game.editor.settings.setItem('timeline-showed', t);
		if (t) {
			bringTimelineForward();
		}
	}

	onAutoSelect(selectPath: string[]) {
		if (!this.state.toggled) {
			this.onToggleClick();
			window.setTimeout(() => {
				SpineSequences.onAutoSelect(selectPath);
			}, 1);
		} else {
			SpineSequences.onAutoSelect(selectPath);
		}
	}

	componentDidUpdate() {
		this._renderWindow();
	}

	_renderWindow() {
		if (this.state.toggled) {
			showAdditionalWindow('spine-sequence', 'Spine sequences', 'Spine sequences',
				R.div({ title: '' },
					h(SpineSequences, { spine: game.editor.selection[0] as Spine, onCloseClick: this.onToggleClick }),
				), 20, 65, 90, 95, 1120, 220);
		} else {
			this._hideWindow();
		}
	}

	_hideWindow() {
		hideAdditionalWindow('spine-sequence');
	}
}
