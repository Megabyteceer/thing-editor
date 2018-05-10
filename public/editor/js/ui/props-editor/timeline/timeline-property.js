import Timeline from './timeline.js';

export default class TimelineProperty extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onToggleClick = this.onToggleClick.bind(this);
	}
	
	onToggleClick() {
		this.setState({toggled: !this.state.toggled});
	}
	
	render () {
		var btn = R.btn(this.state.toggled ? 'Close Timeline' : 'Open timeline', this.onToggleClick);
		var timeline;
		if(this.state.toggled) {
			debugger;
			timeline = editor.ui.renderWindow('timeline', 'Timeline', React.createElement(Timeline), 1000, 1000, 400, 150, 400, 150);
		}
		return R.fragment(btn,);
	}
}

