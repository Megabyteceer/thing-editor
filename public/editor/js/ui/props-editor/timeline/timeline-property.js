import Timeline from './timeline.js';
import Window from '../../window.js';

export default class TimelineProperty extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {toggled:editor.settings.getItem('timeline-showed', true)};
		this.onToggleClick = this.onToggleClick.bind(this);
	}
	
	componentWillUnmount() {
		Timeline.removeAffectFromUnselected(true);
	}
	
	onToggleClick() { //show/hide timeline window
		let t = !this.state.toggled;
		this.setState({toggled: t});
		editor.settings.setItem('timeline-showed', t);
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close Timeline' : 'Open timeline', this.onToggleClick);
		let timeline;
		if(this.state.toggled) {
			timeline = editor.ui.renderWindow('timeline', 'Timeline', React.createElement(Timeline, {onCloseClick:this.onToggleClick}), 586, 650, 400, 150, 1137, 407);
			setTimeout(() => {
				Window.bringWindowForward($('#window-propsEditor'));
				Window.bringWindowForward($('#window-timeline'));
			}, 1);
		}
		return R.fragment(btn, timeline);
	}
}

