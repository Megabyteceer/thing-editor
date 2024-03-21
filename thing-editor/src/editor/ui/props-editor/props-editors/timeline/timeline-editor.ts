import type { ClassAttributes } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Window from 'thing-editor/src/editor/ui/editor-window';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import game from 'thing-editor/src/engine/game';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';

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

