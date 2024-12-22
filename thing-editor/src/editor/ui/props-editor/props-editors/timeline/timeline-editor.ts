import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Window from 'thing-editor/src/editor/ui/editor-window';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import makePathForKeyframeAutoSelect from 'thing-editor/src/editor/utils/movie-clip-keyframe-select-path';
import game from 'thing-editor/src/engine/game';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

function bringTimelineForward() {
	Window.bringWindowForward('#propsEditor');
	Window.bringWindowForward('#timeline', true);
}

interface TimelineEditorState {
	toggled: boolean;
}

export default class TimelineEditor extends Component<ClassAttributes<TimelineEditor>, TimelineEditorState> {

	constructor(props: ClassAttributes<TimelineEditor>) {
		super(props);
		this.state = { toggled: game.editor.settings.getItem('timeline-showed', true) };
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	static search(textToSearch:string, timeline: TimelineData, property: EditablePropertyDesc, o:Container, addSearchEntry: (o: Container, propertyName: string) => void): boolean {
		let ret = false;
		for (let field of timeline.f) {
			for (let k of field.t) {
				if (k.a && (k.a.toLowerCase().indexOf(textToSearch) >= 0)) {
					addSearchEntry(o, makePathForKeyframeAutoSelect(property, field, k));
					ret = true;
				}
			}
		}
		for (let label in timeline.l) {
			if (label.toLowerCase().indexOf(textToSearch) >= 0) {
				addSearchEntry(o, property.name + ',,' + label);
				ret = true;
			}
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
				Timeline.onAutoSelect(selectPath);
			}, 1);
		} else {
			Timeline.onAutoSelect(selectPath);
		}
	}

	render() {
		return R.btn(this.state.toggled ? 'Close Timeline' : 'Open Timeline', this.onToggleClick, undefined, undefined, { key: 'l', ctrlKey: true });
	}

	componentDidUpdate() {
		this._renderWindow();
	}

	_renderWindow() {
		if (this.state.toggled) {
			showAdditionalWindow('timeline', 'Timeline', 'Timeline',
				R.div({ title: '' },
					h(Timeline, { onCloseClick: this.onToggleClick }),
				), 0, 70, 100, 100, 1120, 200);
		} else {
			this._hideWindow();
		}
	}

	_hideWindow() {
		hideAdditionalWindow('timeline');
		if (game.currentContainer && game.__EDITOR_mode) {
			for (let m of game.currentContainer.findChildrenByType(MovieClip)) {
				m.resetTimeline();
			}
		}
	}
}

