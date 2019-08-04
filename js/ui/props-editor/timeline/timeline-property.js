import Timeline from './timeline.js';
import Window from '../../window.js';

function bingTimelineForward() {
	Window.bringWindowForward('#window-propsEditor');
	Window.bringWindowForward('#window-timeline');
}

export default class TimelineProperty extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {toggled:editor.settings.getItem('timeline-showed', true)};
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	componentDidMount() {
		bingTimelineForward();
	}

	onToggleClick() { //show/hide timeline window
		let t = !this.state.toggled;
		this.setState({toggled: t});
		editor.settings.setItem('timeline-showed', t);
		if(t) {
			bingTimelineForward();
		}
	}

	onAutoSelect(selectPath) {
		if(!this.state.toggled) {
			this.onToggleClick();
			setTimeout(()=> {
				Timeline.onAutoSelect(selectPath);
			}, 1);
		} else {
			Timeline.onAutoSelect(selectPath);
		}
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close Timeline (Ctrl+L)' : 'Open timeline (Ctrl+L)', this.onToggleClick, undefined, undefined, 1076);
		let timeline;
		if(this.state.toggled) {
			timeline = editor.ui.renderWindow('timeline', 'Timeline',
				R.div({title:''},
					React.createElement(Timeline, {onCloseClick:this.onToggleClick}),
				), 586, 650, 1260, 150, 1260, 407);
		}
		return R.fragment(btn, timeline);
	}
}

